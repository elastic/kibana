import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
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
        .then(function (message) {
          log.debug(`Saved viz message = ${message}`);
          expect(message).to.be(`Visualization Editor: Saved Visualization "${vizNamewithSpecialChars}"`);
        })
        .then(function testVisualizeWaitForToastMessageGone() {
          return PageObjects.visualize.waitForToastMessageGone();
        });
      });

      it('should save and load with non-ascii characters', async function () {
        const vizNamewithSpecialChars = `${vizName1} with Umlaut ä`;
        const message = await PageObjects.visualize.saveVisualization(vizNamewithSpecialChars);

        log.debug(`Saved viz message with umlaut = ${message}`);
        expect(message).to.be(`Visualization Editor: Saved Visualization "${vizNamewithSpecialChars}"`);

        await PageObjects.visualize.waitForToastMessageGone();
      });

      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
        .then(function (message) {
          log.debug('Saved viz message = ' + message);
          screenshots.take('Visualize-area-chart-save-toast');
          expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
        })
        .then(function testVisualizeWaitForToastMessageGone() {
          return PageObjects.visualize.waitForToastMessageGone();
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

      it('should show correct chart, take screenshot', function () {
        const xAxisLabels = [ '2015-09-20 00:00', '2015-09-21 00:00',
          '2015-09-22 00:00', '2015-09-23 00:00'
        ];
        const yAxisLabels = ['0','200','400','600','800','1,000','1,200','1,400','1,600'];
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
          screenshots.take('Visualize-area-chart');
          expect(paths).to.eql(expectedAreaChartData);
        });
      });

      it('should show correct data', function () {
        const expectedTableData = [ 'September 20th 2015, 00:00:00.000', '37',
          'September 20th 2015, 03:00:00.000', '202',
          'September 20th 2015, 06:00:00.000', '740',
          'September 20th 2015, 09:00:00.000', '1,437',
          'September 20th 2015, 12:00:00.000', '1,371',
          'September 20th 2015, 15:00:00.000', '751',
          'September 20th 2015, 18:00:00.000', '188',
          'September 20th 2015, 21:00:00.000', '31',
          'September 21st 2015, 00:00:00.000', '42',
          'September 21st 2015, 03:00:00.000', '202',
          'September 21st 2015, 06:00:00.000', '683',
          'September 21st 2015, 09:00:00.000', '1,361',
          'September 21st 2015, 12:00:00.000', '1,415',
          'September 21st 2015, 15:00:00.000', '707',
          'September 21st 2015, 18:00:00.000', '177',
          'September 21st 2015, 21:00:00.000', '27',
          'September 22nd 2015, 00:00:00.000', '32',
          'September 22nd 2015, 03:00:00.000', '175',
          'September 22nd 2015, 06:00:00.000', '707',
          'September 22nd 2015, 09:00:00.000', '1,408',
          'September 22nd 2015, 12:00:00.000', '1,355',
          'September 22nd 2015, 15:00:00.000', '726',
          'September 22nd 2015, 18:00:00.000', '201',
          'September 22nd 2015, 21:00:00.000', '29'
        ];

        return PageObjects.visualize.collapseChart()
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
    });
  });
}
