import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('vertical bar chart', function () {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';
    const vizName1 = 'Visualization VerticalBarChart';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickVerticalBarChart');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = X-Axis');
      await PageObjects.visualize.clickBucket('X-Axis');
      log.debug('Aggregation = Date Histogram');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      log.debug('Field = @timestamp');
      await PageObjects.visualize.selectField('@timestamp');
      // leaving Interval set to Auto
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    });

    it('should save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.visualize.waitForVisualization();
    });

    it('should display spy panel toggle button', async function () {
      const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
      expect(spyToggleExists).to.be(true);
    });

    it('should show correct chart', async function () {
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

    it('should show correct data', async function () {
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

      await PageObjects.visualize.toggleSpyPanel();
      const data = await PageObjects.visualize.getDataTableData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.eql(expectedChartData);
    });
  });
}
