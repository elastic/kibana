import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize', 'header']);

  describe('visualize app', function describeIndexTests() {
    before(async function () {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToUrl('visualize', 'new');

      log.debug('clickLineChart');
      await PageObjects.visualize.clickLineChart();
      await PageObjects.visualize.clickNewSearch();

      log.debug('Set absolute time range from \"' + fromTime + '\" to \"' + toTime + '\"');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      // make sure that changes in the test are what will make the visualization dirty
      await PageObjects.visualize.clickGo();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const isEnabled = await PageObjects.visualize.isSaveButtonEnabled();
      expect(isEnabled).to.be(true);
    });

    describe('editor', function indexPatternCreation() {
      it('should disable the save button if visualization is dirty', async function () {
        log.debug('Bucket = Split Chart');
        await PageObjects.visualize.clickBucket('Split Chart');
        log.debug('Aggregation = Terms');
        await PageObjects.visualize.selectAggregation('Terms');
        log.debug('Field = extension');
        await PageObjects.visualize.selectField('extension.raw');

        const isEnabled = await PageObjects.visualize.isSaveButtonEnabled();
        expect(isEnabled).to.be(false);
      });

      it('should enable the save button if changes are applied', async function () {
        log.debug('Bucket = Split Chart');
        await PageObjects.visualize.clickBucket('Split Chart');
        log.debug('Aggregation = Terms');
        await PageObjects.visualize.selectAggregation('Terms');
        log.debug('Field = extension');
        await PageObjects.visualize.selectField('extension.raw');

        await PageObjects.visualize.clickGo();
        await PageObjects.header.waitUntilLoadingHasFinished();

        const isEnabled = await PageObjects.visualize.isSaveButtonEnabled();
        expect(isEnabled).to.be(true);
      });
    });
  });
}
