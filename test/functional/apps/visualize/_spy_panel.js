import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function () {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      await PageObjects.common.navigateToUrl('visualize', 'new');
      await PageObjects.visualize.clickVerticalBarChart();
      await PageObjects.visualize.clickNewSearch();

      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    describe('spy panel tabel', function indexPatternCreation() {

      it('should update table header when columns change', async function () {

        await PageObjects.visualize.openSpyPanel();
        let headers = await PageObjects.visualize.getDataTableHeaders();
        expect(headers.trim()).to.equal('Count');

        log.debug('Add Average Metric on machine.ram field');
        await PageObjects.visualize.clickAddMetric();
        await PageObjects.visualize.clickBucket('Y-Axis');
        await PageObjects.visualize.selectAggregation('Average', 'metrics');
        await PageObjects.visualize.selectField('machine.ram', 'metrics');
        await PageObjects.visualize.clickGo();
        await PageObjects.visualize.openSpyPanel();

        headers = await PageObjects.visualize.getDataTableHeaders();
        expect(headers.trim()).to.equal('Count Average machine.ram');
      });
    });
  });
}
