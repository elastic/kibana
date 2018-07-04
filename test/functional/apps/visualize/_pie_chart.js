import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('pie chart', async function () {
    const vizName1 = 'Visualization PieChart';
    before(async function () {

      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickPieChart');
      await PageObjects.visualize.clickPieChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('select bucket Split Slices');
      await PageObjects.visualize.clickBucket('Split Slices');
      log.debug('Click aggregation Histogram');
      await PageObjects.visualize.selectAggregation('Histogram');
      log.debug('Click field memory');
      await PageObjects.visualize.selectField('memory');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(1003);
      log.debug('setNumericInterval 4000');
      await PageObjects.visualize.setNumericInterval('40000');
      log.debug('clickGo');
      await PageObjects.visualize.clickGo();
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
      // sleep a bit before trying to get the pie chart data below
      await PageObjects.common.sleep(2000);
    });

    it('should display spy panel toggle button', async function () {
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });

    it('should show 10 slices in pie chart', async function () {
      const expectedPieChartSliceCount = 10;

      const pieData = await PageObjects.visualize.getPieChartData();
      log.debug('pieData.length = ' + pieData.length);
      expect(pieData.length).to.be(expectedPieChartSliceCount);
    });

    it('should show correct data', function () {
      const expectedTableData =  [ '0', '55', '40,000', '50', '80,000', '41', '120,000', '43',
        '160,000', '44', '200,000', '40', '240,000', '46', '280,000', '39', '320,000', '40', '360,000', '47'
      ];

      return PageObjects.visualize.toggleSpyPanel()
        .then(function () {
          return PageObjects.visualize.setSpyPanelPageSize('All');
        })
        .then(function getDataTableData() {
          return PageObjects.visualize.getDataTableData();
        })
        .then(function showData(data) {
          log.debug(data.split('\n'));
          expect(data.trim().split('\n')).to.eql(expectedTableData);
        });
    });

    it('should show other and missing bucket', async function () {
      const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'Missing', 'Other' ];

      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickPieChart');
      await PageObjects.visualize.clickPieChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('select bucket Split Slices');
      await PageObjects.visualize.clickBucket('Split Slices');
      log.debug('Click aggregation Histogram');
      await PageObjects.visualize.selectAggregation('Terms');
      log.debug('Click field memory');
      await PageObjects.visualize.selectField('machine.os.raw');
      await PageObjects.visualize.toggleOtherBucket();
      await PageObjects.visualize.toggleMissingBucket();
      log.debug('clickGo');
      await PageObjects.visualize.clickGo();
      await PageObjects.common.sleep(1003);
      const pieData = await PageObjects.visualize.getPieChartLabels();
      log.debug('pieData.length = ' + pieData.length);
      expect(pieData).to.eql(expectedTableData);
    });

    describe('disabled aggs', () => {
      before(async () => {
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visualize.waitForVisualization();
        // sleep a bit before trying to get the pie chart data below
        await PageObjects.common.sleep(2000);
      });

      it('should show correct result with one agg disabled', async () => {
        const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'osx'  ];

        await PageObjects.visualize.clickAddBucket();
        await PageObjects.visualize.clickBucket('Split Slices');
        await PageObjects.visualize.selectAggregation('Terms');
        await PageObjects.visualize.selectField('machine.os.raw');
        await PageObjects.visualize.toggleDisabledAgg(2);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const pieData = await PageObjects.visualize.getPieChartLabels();
        log.debug('pieData.length = ' + pieData.length);
        expect(pieData).to.eql(expectedTableData);
      });

      it('should correctly save disabled agg', async () => {
        await PageObjects.visualize.saveVisualization(vizName1);
        const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
        log.debug(`Save viz page title is ${pageTitle}`);
        expect(pageTitle).to.contain(vizName1);
        await PageObjects.header.waitForToastMessageGone();
        await PageObjects.visualize.loadSavedVisualization(vizName1);
        await PageObjects.visualize.waitForVisualization();

        const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'osx'  ];
        const pieData = await PageObjects.visualize.getPieChartLabels();
        log.debug('pieData.length = ' + pieData.length);
        expect(pieData).to.eql(expectedTableData);
      });

      it('should show correct result when agg is re-enabled', async () => {
        await PageObjects.visualize.toggleDisabledAgg(2);
        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const expectedTableData =  [
          '0', 'win 7', 'win xp', 'win 8', 'ios', 'osx', '40,000', 'win 8', 'ios', 'win 7', 'win xp', 'osx', '80,000',
          'win 7', 'win 8', 'osx', 'win xp', 'ios', '120,000', 'ios', 'win xp', 'win 7', 'win 8', 'osx', '160,000',
          'win 8', 'ios', 'win 7', 'win xp', 'osx', '200,000', 'win 8', 'ios', 'win xp', 'win 7', 'osx', '240,000',
          'ios', 'win 7', 'win xp', 'win 8', 'osx', '280,000', 'win xp', 'win 8', 'win 7', 'ios', 'osx', '320,000',
          'win xp', 'win 7', 'ios', 'win 8', 'osx', '360,000', 'win 7', 'win xp', 'ios', 'win 8', 'osx' ];
        const pieData = await PageObjects.visualize.getPieChartLabels();
        log.debug('pieData.length = ' + pieData.length);
        expect(pieData).to.eql(expectedTableData);
      });
    });
  });
}
