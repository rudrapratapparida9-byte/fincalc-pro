/**
 * FinCalcPro - High Precision Financial Engine & Chart Visualizer
 */

(function () {
  'use strict';

  let currentCurrency = '$';
  let mortgageChartInstance = null;
  let sipChartInstance = null;
  let retirementChartInstance = null;

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupCurrency();
    setupTheme();
    setupCalculators();
    runAllCalculations();
  });

  function setupNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.calc-panel');
    const jumpPills = document.querySelectorAll('.jump-pill');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    jumpPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const target = pill.dataset.target;
        switchTab(target);
        if (pill.dataset.preset === 'auto') {
          document.getElementById('loanAmount').value = 35000;
          document.getElementById('loanAmountSlider').value = 35000;
          document.getElementById('loanTerm').value = 5;
          document.getElementById('interestRate').value = 5.5;
          document.getElementById('interestRateSlider').value = 5.5;
          calculateMortgage();
        }
        document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' });
      });
    });

    function switchTab(tabId) {
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
      panels.forEach(p => p.classList.toggle('active', p.id === `panel-${tabId}`));
    }
  }

  function setupCurrency() {
    const select = document.getElementById('currencySelect');
    select.addEventListener('change', () => {
      const selectedOpt = select.options[select.selectedIndex];
      currentCurrency = selectedOpt.dataset.symbol || '$';
      document.querySelectorAll('.curr-sym').forEach(el => el.textContent = currentCurrency);
      runAllCalculations();
    });
  }

  function setupTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const saved = localStorage.getItem('fincalc-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    if (themeBtn) {
      themeBtn.querySelector('i').className = saved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('fincalc-theme', next);
        themeBtn.querySelector('i').className = next === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        updateChartThemes();
      });
    }
  }

  function setupCalculators() {
    // 1. Mortgage
    bindSliderAndInput('loanAmountSlider', 'loanAmount', 'loanAmountVal', calculateMortgage);
    bindSliderAndInput('interestRateSlider', 'interestRate', 'interestRateVal', calculateMortgage, '%');
    document.getElementById('loanTerm').addEventListener('change', calculateMortgage);
    document.getElementById('extraPayment').addEventListener('input', calculateMortgage);

    // 2. SIP
    bindSliderAndInput('sipMonthlySlider', 'sipMonthly', 'sipMonthlyVal', calculateSIP);
    bindSliderAndInput('sipRateSlider', 'sipRate', 'sipRateVal', calculateSIP, '%');
    bindSliderAndInput('sipYearsSlider', 'sipYears', 'sipYearsVal', calculateSIP, ' Yrs');
    document.getElementById('sipStepUp').addEventListener('input', calculateSIP);

    // 3. Retirement
    ['currentAge', 'retireAge', 'monthlyExpense', 'inflationRate', 'swrRate'].forEach(id => {
      document.getElementById(id).addEventListener('input', calculateRetirement);
    });

    // 4. Tax
    ['annualRevenue', 'deductions', 'effectiveTaxRate'].forEach(id => {
      document.getElementById(id).addEventListener('input', calculateTax);
    });

    // 5. Trading
    ['buyPrice', 'sellPrice', 'tradeQty', 'tradeFee'].forEach(id => {
      document.getElementById(id).addEventListener('input', calculateTrading);
    });
  }

  function bindSliderAndInput(sliderId, inputId, valDisplayId, callback, suffix = '') {
    const slider = document.getElementById(sliderId);
    const input = document.getElementById(inputId);
    const display = document.getElementById(valDisplayId);

    slider.addEventListener('input', () => {
      input.value = slider.value;
      if (display) display.textContent = formatNumber(slider.value) + suffix;
      callback();
    });

    input.addEventListener('input', () => {
      slider.value = input.value;
      if (display) display.textContent = formatNumber(input.value) + suffix;
      callback();
    });
  }

  function runAllCalculations() {
    calculateMortgage();
    calculateSIP();
    calculateRetirement();
    calculateTax();
    calculateTrading();
  }

  // Mortgage Formula
  function calculateMortgage() {
    const P = parseFloat(document.getElementById('loanAmount').value) || 0;
    const annualRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const years = parseFloat(document.getElementById('loanTerm').value) || 30;
    const extra = parseFloat(document.getElementById('extraPayment').value) || 0;

    const r = annualRate / 100 / 12;
    const n = years * 12;

    let emi = 0;
    if (r > 0 && n > 0 && P > 0) {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    const totalMonthly = emi + extra;
    const totalPayment = emi * n;
    const totalInterest = Math.max(0, totalPayment - P);
    const ratio = P > 0 ? (totalInterest / P) * 100 : 0;

    document.getElementById('monthlyPaymentDisplay').innerHTML = `${currentCurrency}${formatCurrency(totalMonthly)}`;
    document.getElementById('principalDisplay').innerHTML = `${currentCurrency}${formatCurrency(P)}`;
    document.getElementById('totalInterestDisplay').innerHTML = `${currentCurrency}${formatCurrency(totalInterest)}`;
    document.getElementById('totalPaymentDisplay').innerHTML = `${currentCurrency}${formatCurrency(totalPayment)}`;
    document.getElementById('interestRatioDisplay').textContent = `${ratio.toFixed(1)}%`;
    document.getElementById('termDurationSub').textContent = `Over ${years} Years (${n} payments)`;

    renderMortgageChart(P, totalInterest);
  }

  // SIP Formula
  function calculateSIP() {
    const monthly = parseFloat(document.getElementById('sipMonthly').value) || 0;
    const rate = parseFloat(document.getElementById('sipRate').value) || 0;
    const years = parseFloat(document.getElementById('sipYears').value) || 0;
    const stepUp = parseFloat(document.getElementById('sipStepUp').value) || 0;

    const i = rate / 100 / 12;
    const months = years * 12;

    let totalInvested = 0;
    let futureValue = 0;
    let currentMonthly = monthly;

    for (let m = 1; m <= months; m++) {
      if (m > 1 && (m - 1) % 12 === 0 && stepUp > 0) {
        currentMonthly += currentMonthly * (stepUp / 100);
      }
      totalInvested += currentMonthly;
      futureValue = (futureValue + currentMonthly) * (1 + i);
    }

    const totalGains = Math.max(0, futureValue - totalInvested);

    document.getElementById('sipTotalValueDisplay').innerHTML = `${currentCurrency}${formatCurrency(futureValue)}`;
    document.getElementById('sipInvestedDisplay').innerHTML = `${currentCurrency}${formatCurrency(totalInvested)}`;
    document.getElementById('sipGainsDisplay').innerHTML = `${currentCurrency}${formatCurrency(totalGains)}`;
    document.getElementById('sipMultiplierSub').textContent = `Invested ${currentCurrency}${formatCurrency(totalInvested)} &rarr; Wealth Multiplier ${(futureValue / (totalInvested || 1)).toFixed(2)}x`;

    renderSipChart(totalInvested, totalGains);
  }

  // FIRE Retirement Formula
  function calculateRetirement() {
    const currentAge = parseFloat(document.getElementById('currentAge').value) || 28;
    const retireAge = parseFloat(document.getElementById('retireAge').value) || 50;
    const monthlyExp = parseFloat(document.getElementById('monthlyExpense').value) || 3000;
    const inflation = parseFloat(document.getElementById('inflationRate').value) || 6.0;
    const swr = parseFloat(document.getElementById('swrRate').value) || 4.0;

    const yearsToRetire = Math.max(1, retireAge - currentAge);
    const inflationFactor = Math.pow(1 + inflation / 100, yearsToRetire);
    const futureMonthlyExp = monthlyExp * inflationFactor;
    const futureAnnualExp = futureMonthlyExp * 12;

    const corpusRequired = futureAnnualExp / (swr / 100);

    // Monthly savings required assuming 10% returns during accumulation
    const r = 0.10 / 12;
    const n = yearsToRetire * 12;
    const monthlySavings = (corpusRequired * r) / (Math.pow(1 + r, n) - 1);

    document.getElementById('fireCorpusDisplay').innerHTML = `${currentCurrency}${formatCurrency(corpusRequired)}`;
    document.getElementById('retireExpenseDisplay').innerHTML = `${currentCurrency}${formatCurrency(futureMonthlyExp)} / Mo`;
    document.getElementById('monthlySavingsNeeded').innerHTML = `${currentCurrency}${formatCurrency(monthlySavings)} / Mo`;
    document.getElementById('fireYearsSub').textContent = `In ${yearsToRetire} Years (Target Age ${retireAge})`;

    renderRetirementChart(futureAnnualExp * 25, corpusRequired);
  }

  // Tax Formula
  function calculateTax() {
    const rev = parseFloat(document.getElementById('annualRevenue').value) || 0;
    const ded = parseFloat(document.getElementById('deductions').value) || 0;
    const rate = parseFloat(document.getElementById('effectiveTaxRate').value) || 0;

    const taxableBase = Math.max(0, rev - ded);
    const tax = taxableBase * (rate / 100);
    const net = rev - tax;
    const monthlyInHand = net / 12;

    document.getElementById('netIncomeDisplay').innerHTML = `${currentCurrency}${formatCurrency(net)}`;
    document.getElementById('taxableBaseDisplay').innerHTML = `${currentCurrency}${formatCurrency(taxableBase)}`;
    document.getElementById('taxPayableDisplay').innerHTML = `${currentCurrency}${formatCurrency(tax)}`;
    document.getElementById('monthlyInHandSub').innerHTML = `~ ${currentCurrency}${formatCurrency(monthlyInHand)} / Month In-Hand`;
  }

  // Trading ROI Formula
  function calculateTrading() {
    const buy = parseFloat(document.getElementById('buyPrice').value) || 0;
    const sell = parseFloat(document.getElementById('sellPrice').value) || 0;
    const qty = parseFloat(document.getElementById('tradeQty').value) || 0;
    const feePercent = parseFloat(document.getElementById('tradeFee').value) || 0;

    const capital = buy * qty;
    const grossExit = sell * qty;
    const totalFees = (capital + grossExit) * (feePercent / 100);
    const netExit = grossExit - totalFees;
    const profit = netExit - capital;
    const roi = capital > 0 ? (profit / capital) * 100 : 0;

    const sign = profit >= 0 ? '+' : '';
    document.getElementById('tradingProfitDisplay').innerHTML = `${sign}${currentCurrency}${formatCurrency(profit)}`;
    document.getElementById('tradingProfitDisplay').className = `metric-big-val ${profit >= 0 ? 'text-success' : 'text-danger'}`;
    document.getElementById('tradeCapitalDisplay').innerHTML = `${currentCurrency}${formatCurrency(capital)}`;
    document.getElementById('tradeExitDisplay').innerHTML = `${currentCurrency}${formatCurrency(netExit)}`;
    document.getElementById('tradingRoiSub').textContent = `${sign}${roi.toFixed(2)}% Return on Capital`;
  }

  // Charts Helpers
  function renderMortgageChart(principal, interest) {
    const ctx = document.getElementById('mortgageChart');
    if (!ctx) return;
    if (mortgageChartInstance) mortgageChartInstance.destroy();

    mortgageChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Principal Amount', 'Total Interest'],
        datasets: [{
          data: [principal, interest],
          backgroundColor: ['#4f46e5', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: getTextColor() } }
        }
      }
    });
  }

  function renderSipChart(invested, gains) {
    const ctx = document.getElementById('sipChart');
    if (!ctx) return;
    if (sipChartInstance) sipChartInstance.destroy();

    sipChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Invested Capital', 'Wealth Gain (Interest)'],
        datasets: [{
          data: [invested, gains],
          backgroundColor: ['#3b82f6', '#10b981'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: getTextColor() } }
        }
      }
    });
  }

  function renderRetirementChart(baseExp, targetCorpus) {
    const ctx = document.getElementById('retirementChart');
    if (!ctx) return;
    if (retirementChartInstance) retirementChartInstance.destroy();

    retirementChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['25x Rule Base', 'Inflation-Adjusted Target'],
        datasets: [{
          label: 'Corpus ($)',
          data: [baseExp, targetCorpus],
          backgroundColor: ['#8b5cf6', '#06b6d4'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: getTextColor() }, grid: { color: 'rgba(0,0,0,0.05)' } },
          x: { ticks: { color: getTextColor() }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateChartThemes() {
    if (mortgageChartInstance) mortgageChartInstance.update();
    if (sipChartInstance) sipChartInstance.update();
    if (retirementChartInstance) retirementChartInstance.update();
  }

  function getTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#64748b';
  }

  function formatCurrency(val) {
    return Math.round(val).toLocaleString('en-US');
  }

  function formatNumber(val) {
    return Number(val).toLocaleString('en-US');
  }

})();
