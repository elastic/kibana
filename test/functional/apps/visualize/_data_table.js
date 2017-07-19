import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    const fromTime = '2015-09-19 06:31:44.000';
    const toTime = '2015-09-23 18:31:44.000';

    before(function () {
      log.debug('navigateToApp visualize');
      return PageObjects.common.navigateToUrl('visualize', 'new')
      .then(function () {
        log.debug('clickDataTable');
        return PageObjects.visualize.clickDataTable();
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
        log.debug('Bucket = Split Rows');
        return PageObjects.visualize.clickBucket('Split Rows');
      })
      .then(function selectAggregation() {
        log.debug('Aggregation = Histogram');
        return PageObjects.visualize.selectAggregation('Histogram');
      })
      .then(function selectField() {
        log.debug('Field = bytes');
        return PageObjects.visualize.selectField('bytes');
      })
      .then(function setInterval() {
        log.debug('Interval = 2000');
        return PageObjects.visualize.setNumericInterval('2000');
      })
      .then(function clickGo() {
        return PageObjects.visualize.clickGo();
      })
      .then(function () {
        return PageObjects.header.waitUntilLoadingHasFinished();
      });
    });

    describe('data table', function indexPatternCreation() {
      const vizName1 = 'Visualization DataTable';

      it('should be able to save and load', function () {
        return PageObjects.visualize.saveVisualization(vizName1)
        .then(function (message) {
          log.debug('Saved viz message = ' + message);
          expect(message).to.be('Visualization Editor: Saved Visualization \"' + vizName1 + '\"');
        })
        .then(function testVisualizeWaitForToastMessageGone() {
          return PageObjects.visualize.waitForToastMessageGone();
        })
        .then(function () {
          return PageObjects.visualize.loadSavedVisualization(vizName1);
        })
        .then(function () {
          return PageObjects.visualize.waitForVisualization();
        });
      });

      it('should show correct data, take screenshot', function () {
        const expectedChartData = [
          '0', '2,088', '2,000', '2,748', '4,000', '2,707', '6,000', '2,876',
          '8,000', '2,863', '10,000', '147', '12,000', '148', '14,000', '129', '16,000', '161', '18,000', '137'
        ];

        return retry.try(function () {
          return PageObjects.visualize.getDataTableData()
          .then(function showData(data) {
            log.debug(data.split('\n'));
            screenshots.take('Visualize-data-table');
            expect(data.split('\n')).to.eql(expectedChartData);
          });
        });
      });

    });
  });
}
