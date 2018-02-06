import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('visualize app', function describeIndexTests() {
    before(function () {

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickPieChart');
          return PageObjects.visualize.clickPieChart();
        })
        .then(function clickNewSearch() {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function () {
          log.debug('select bucket Split Slices');
          return PageObjects.visualize.clickBucket('Split Slices');
        })
        .then(function () {
          log.debug('Click aggregation Histogram');
          return PageObjects.visualize.selectAggregation('Histogram');
        })
        .then(function () {
          log.debug('Click field memory');
          return PageObjects.visualize.selectField('memory');
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        })
        .then(function sleep() {
          return PageObjects.common.sleep(1003);
        })
        .then(function () {
          log.debug('setNumericInterval 4000');
          return PageObjects.visualize.setNumericInterval('40000');
        })
        .then(function () {
          log.debug('clickGo');
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });


    describe('pie chart', function indexPatternCreation() {
      const vizName1 = 'Visualization PieChart';

      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Save viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizName1);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          })
          .then(function () {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function waitForVisualization() {
            return PageObjects.visualize.waitForVisualization();
          })
        // sleep a bit before trying to get the pie chart data below
          .then(function sleep() {
            return PageObjects.common.sleep(2000);
          });
      });

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('should show 10 slices in pie chart, take screenshot', function () {
        const expectedPieChartSliceCount = 10;

        return PageObjects.visualize.getPieChartData()
          .then(function (pieData) {
            log.debug('pieData.length = ' + pieData.length);
            expect(pieData.length).to.be(expectedPieChartSliceCount);
          });
      });

      it('should show correct data', function () {
        const expectedTableData =  [ '0', '55', '40,000', '50', '80,000', '41', '120,000', '43',
          '160,000', '44', '200,000', '40', '240,000', '46', '280,000', '39', '320,000', '40', '360,000', '47'
        ];

        return PageObjects.visualize.toggleSpyPanel()
          .then(function () {
            return PageObjects.settings.setPageSize('All');
          })
          .then(function getDataTableData() {
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            log.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          });
      });

      it('should show other and missing bucket', function () {
        const expectedTableData =  [ 'win 8', 'win xp', 'win 7', 'ios', 'Missing', 'Other' ];

        return PageObjects.common.navigateToUrl('visualize', 'new')
          .then(function () {
            log.debug('clickPieChart');
            return PageObjects.visualize.clickPieChart();
          })
          .then(function clickNewSearch() {
            return PageObjects.visualize.clickNewSearch();
          })
          .then(function setAbsoluteRange() {
            log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
            return PageObjects.header.setAbsoluteRange(fromTime, toTime);
          })
          .then(function () {
            log.debug('select bucket Split Slices');
            return PageObjects.visualize.clickBucket('Split Slices');
          })
          .then(function () {
            log.debug('Click aggregation Histogram');
            return PageObjects.visualize.selectAggregation('Terms');
          })
          .then(function () {
            log.debug('Click field memory');
            return PageObjects.visualize.selectField('machine.os.raw');
          })
          .then(function () {
            return PageObjects.visualize.toggleOtherBucket();
          })
          .then(function () {
            return PageObjects.visualize.toggleMissingBucket();
          })
          .then(function () {
            log.debug('clickGo');
            return PageObjects.visualize.clickGo();
          })
          .then(function waitForVisualization() {
            return PageObjects.header.waitUntilLoadingHasFinished();
          })
          .then(function sleep() {
            return PageObjects.common.sleep(1003);
          })
          .then(function () {
            return PageObjects.visualize.getPieChartLabels();
          })
          .then(function (pieData) {
            log.debug('pieData.length = ' + pieData.length);
            expect(pieData).to.eql(expectedTableData);
          });
      });
    });
  });
}
