import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
        .then(function () {
          log.debug('clickVerticalBarChart');
          return PageObjects.visualize.clickVerticalBarChart();
        })
        .then(function clickNewSearch() {
          return PageObjects.visualize.clickNewSearch();
        })
        .then(function setAbsoluteRange() {
          log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
          return PageObjects.header.setAbsoluteRange(fromTime, toTime);
        })
        .then(function clickBucket() {
          log.debug('Bucket = X-Axis');
          return PageObjects.visualize.clickBucket('X-Axis');
        })
        .then(function selectAggregation() {
          log.debug('Aggregation = Date Histogram');
          return PageObjects.visualize.selectAggregation('Date Histogram');
        })
        .then(function selectField() {
          log.debug('Field = @timestamp');
          return PageObjects.visualize.selectField('@timestamp');
        })
      // leaving Interval set to Auto
        .then(function clickGo() {
          return PageObjects.visualize.clickGo();
        })
        .then(function () {
          return PageObjects.header.waitUntilLoadingHasFinished();
        })
        .then(function waitForVisualization() {
          return PageObjects.visualize.waitForVisualization();
        });
    });

    describe('vertical bar chart', function indexPatternCreation() {
      const vizName1 = 'Visualization VerticalBarChart';

      it('should save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
          .then(function (message) {
            log.debug('Saved viz message = ' + message);
            expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
          })
          .then(function testVisualizeWaitForToastMessageGone() {
            return PageObjects.header.waitForToastMessageGone();
          })
          .then(function () {
            return PageObjects.visualize.loadSavedVisualization(vizName1);
          })
          .then(function () {
            return PageObjects.header.waitUntilLoadingHasFinished();
          })
          .then(function waitForVisualization() {
            return PageObjects.visualize.waitForVisualization();
          });
      });

      it('should display spy panel toggle button', async function () {
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('should show correct chart, take screenshot', async function () {
        const expectedChartValues = [37, 202, 740, 1437, 1371, 751, 188, 31, 42, 202, 683,
          1361, 1415, 707, 177, 27, 32, 175, 707, 1408, 1355, 726, 201, 29
        ];

        // Most recent failure on Jenkins usually indicates the bar chart is still being drawn?
        // return arguments[0].getAttribute(arguments[1]);","args":[{"ELEMENT":"592"},"fill"]}] arguments[0].getAttribute is not a function
        // try sleeping a bit before getting that data
        await retry.try(async () => {
          const data = await PageObjects.visualize.getBarChartData();
          log.debug('data=' + data);
          log.debug('data.length=' + data.length);
          expect(data).to.eql(expectedChartValues);
        });
      });

      it('should show correct data', function () {
        // this is only the first page of the tabular data.
        const expectedChartData =  [ '2015-09-20 00:00', '37',
          '2015-09-20 03:00', '202',
          '2015-09-20 06:00', '740',
          '2015-09-20 09:00', '1,437',
          '2015-09-20 12:00', '1,371',
          '2015-09-20 15:00', '751',
          '2015-09-20 18:00', '188',
          '2015-09-20 21:00', '31',
          '2015-09-21 00:00', '42',
          '2015-09-21 03:00', '202'
        ];

        return PageObjects.visualize.toggleSpyPanel()
          .then(function showData() {
            return PageObjects.visualize.getDataTableData();
          })
          .then(function showData(data) {
            log.debug(data.split('\n'));
            expect(data.trim().split('\n')).to.eql(expectedChartData);
          });
      });
    });
  });
}
