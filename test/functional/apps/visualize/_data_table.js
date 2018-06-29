import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('data table', function () {
    const vizName1 = 'Visualization DataTable';

    before(async function () {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');
      log.debug('clickDataTable');
      await PageObjects.visualize.clickDataTable();
      log.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();
      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      log.debug('Bucket = Split Rows');
      await PageObjects.visualize.clickBucket('Split Rows');
      log.debug('Aggregation = Histogram');
      await PageObjects.visualize.selectAggregation('Histogram');
      log.debug('Field = bytes');
      await PageObjects.visualize.selectField('bytes');
      log.debug('Interval = 2000');
      await PageObjects.visualize.setNumericInterval('2000');
      await PageObjects.visualize.clickGo();
    });

    it('should be able to save and load', async function () {
      await PageObjects.visualize.saveVisualization(vizName1);
      const pageTitle = await PageObjects.common.getBreadcrumbPageTitle();
      log.debug(`Save viz page title is ${pageTitle}`);
      expect(pageTitle).to.contain(vizName1);
      await PageObjects.header.waitForToastMessageGone();
      await PageObjects.visualize.loadSavedVisualization(vizName1);
      await PageObjects.visualize.waitForVisualization();
    });


    it('should show correct data', function () {
      const expectedChartData = [
        '0B', '2,088', '1.953KB', '2,748', '3.906KB', '2,707', '5.859KB', '2,876', '7.813KB',
        '2,863', '9.766KB', '147', '11.719KB', '148', '13.672KB', '129', '15.625KB', '161', '17.578KB', '137'
      ];

      return retry.try(function () {
        return PageObjects.visualize.getDataTableData()
          .then(function showData(data) {
            log.debug(data.split('\n'));
            expect(data.split('\n')).to.eql(expectedChartData);
          });
      });
    });

    it('should show correct data for a data table with date histogram', async () => {
      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickDataTable();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickBucket('Split Rows');
      await PageObjects.visualize.selectAggregation('Date Histogram');
      await PageObjects.visualize.selectField('@timestamp');
      await PageObjects.visualize.setInterval('Daily');
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
      const data = await PageObjects.visualize.getDataTableData();
      log.debug(data.split('\n'));
      expect(data.trim().split('\n')).to.be.eql([
        '2015-09-20', '4,757',
        '2015-09-21', '4,614',
        '2015-09-22', '4,633',
      ]);
    });

  });
}
