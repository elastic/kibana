import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const remote = getService('remote');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header', 'settings']);

  describe('visualize app', function describeIndexTests() {
    before(function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickAreaChart');
          return PageObjects.visualize.clickAreaChart();
        })
        .then(function clickNewSearch() {
          log.debug('clickNewSearch');
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Click X-Axis');
          return PageObjects.visualize.clickBucket('X-Axis');
        })
        .then(function selectAggregation() {
          log.debug('Click Date Histogram');
          return PageObjects.visualize.selectAggregation('Date Histogram');
        })
        .then(function getField() {
          log.debug('Check field value');
          return PageObjects.visualize.getField();
        })
        .then(function (fieldValue) {
          log.debug('fieldValue = ' + fieldValue);
          expect(fieldValue).to.be('@timestamp');
        })
        .then(function getInterval() {
          return PageObjects.visualize.getInterval();
        })
        .then(function (intervalValue) {
          log.debug('intervalValue = ' + intervalValue);
          expect(intervalValue).to.be('Auto');
        })
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function waitUntilLoadingHasFinished() {
          log.debug('Waiting...');
          return PageObjects.header.waitUntilLoadingHasFinished();
        });
    });

    describe('area charts', function indexPatternCreation() {
      const vizName1 = 'Visualization AreaChart Name Test';

      it('should save and load with special characters', function () {
        const vizNamewithSpecialChars = vizName1 + '/?&=%';
        return PageObjects.visualize.saveVisualization(vizNamewithSpecialChars)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Save viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizNamewithSpecialChars);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          });
      });

      it('should save and load with non-ascii characters', async function () {
        const vizNamewithSpecialChars = `${vizName1} with Umlaut ä`;
        const pageTitle = await PageObjects.visualize.saveVisualization(vizNamewithSpecialChars).then(() => {
          return PageObjects.common.getBreadcrumbPageTitle();
        });

        log.debug(`Saved viz page title with umlaut is ${pageTitle}`);
        expect(pageTitle).to.contain(vizNamewithSpecialChars);
      });

      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(() => {
            return PageObjects.common.getBreadcrumbPageTitle();
          })
          .then(pageTitle => {
            log.debug(`Saved viz page title is ${pageTitle}`);
            expect(pageTitle).to.contain(vizName1);
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          })
          .then(function loadSavedVisualization() {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function () {
            return PageObjects.visualize.waitForVisualization();
          })
          // We have to sleep sometime between loading the saved visTitle
          // and trying to access the chart below with getXAxisLabels
          // otherwise it hangs.
          .then(function sleep() {
            return PageObjects.common.sleep(2000);
          });
      });

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('should show correct chart, take screenshot', function () {
        const xAxisLabels = [ '2015-09-20 00:00', '2015-09-21 00:00',
          '2015-09-22 00:00', '2015-09-23 00:00'
        ];
        const yAxisLabels = ['0', '200', '400', '600', '800', '1,000', '1,200', '1,400', '1,600'];
        const expectedAreaChartData = [37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202,
          683, 1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29
        ];

        return retry.try(function tryingForTime() {
          return PageObjects.visualize.getXAxisLabels()
            .then(function compareLabels(labels) {
              log.debug('X-Axis labels = ' + labels);
              expect(labels).to.eql(xAxisLabels);
            });
        })
          .then(function getYAxisLabels() {
            return PageObjects.visualize.getYAxisLabels();
          })
          .then(function (labels) {
            log.debug('Y-Axis labels = ' + labels);
            expect(labels).to.eql(yAxisLabels);
          })
          .then(function getAreaChartData() {
            return PageObjects.visualize.getAreaChartData('Count');
          })
          .then(function (paths) {
            log.debug('expectedAreaChartData = ' + expectedAreaChartData);
            log.debug('actual chart data =     ' + paths);
            expect(paths).to.eql(expectedAreaChartData);
          });
      });

      it('should show correct data', function () {
        const expectedTableData = [ '2015-09-20 00:00', '37',
          '2015-09-20 03:00', '202',
          '2015-09-20 06:00', '740',
          '2015-09-20 09:00', '1,437',
          '2015-09-20 12:00', '1,371',
          '2015-09-20 15:00', '751',
          '2015-09-20 18:00', '188',
          '2015-09-20 21:00', '31',
          '2015-09-21 00:00', '42',
          '2015-09-21 03:00', '202',
          '2015-09-21 06:00', '683',
          '2015-09-21 09:00', '1,361',
          '2015-09-21 12:00', '1,415',
          '2015-09-21 15:00', '707',
          '2015-09-21 18:00', '177',
          '2015-09-21 21:00', '27',
          '2015-09-22 00:00', '32',
          '2015-09-22 03:00', '175',
          '2015-09-22 06:00', '707',
          '2015-09-22 09:00', '1,408',
          '2015-09-22 12:00', '1,355',
          '2015-09-22 15:00', '726',
          '2015-09-22 18:00', '201',
          '2015-09-22 21:00', '29'
        ];

        return PageObjects.visualize.toggleSpyPanel()
          .then(function setPageSize() {
            return PageObjects.settings.setPageSize('All');
          })
          .then(function getDataTableData() {
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            log.debug('getDataTableData = ' + data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedTableData);
          });
      });

      it('should hide side editor if embed is set to true in url', async () => {
        const url = await remote.getCurrentUrl();
        const embedUrl = url.split('/visualize/').pop().replace('?_g=', '?embed=true&_g=');
        await PageObjects.common.navigateToUrl('visualize', embedUrl);
        await PageObjects.header.waitUntilLoadingHasFinished();
        const sideEditorExists = await PageObjects.visualize.getSideEditorExists();
        expect(sideEditorExists).to.be(false);
      });
    });
  });
}
