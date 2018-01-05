import expect from 'expect.js';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'visualize']);

  describe('visualize app', () => {

    describe('experimental visualizations', () => {

      beforeEach(async () => {
        log.debug('navigateToApp visualize');
        await PageObjects.common.navigateToUrl('visualize', 'new');
        await PageObjects.visualize.waitForVisualizationSelectPage();
      });

      it('should show an notification when creating experimental visualizations', async () => {
        // Try to find a experimental visualization.
        const experimentalTypes = await PageObjects.visualize.getExperimentalTypeLinks();
        if (experimentalTypes.length === 0) {
          log.info('No experimental visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await experimentalTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await PageObjects.visualize.selectVisSourceIfRequired();
        // Check that the experimental banner is there and state that this is experimental
        const info = await PageObjects.visualize.getExperimentalInfo();
        expect(await info.getVisibleText()).to.contain('experimental');
      });

      it('should show an notification when creating lab visualizations', async () => {
        // Try to find a lab visualization.
        const labTypes = await PageObjects.visualize.getLabTypeLinks();
        if (labTypes.length === 0) {
          log.info('No lab visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await labTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await PageObjects.visualize.selectVisSourceIfRequired();
        // Check that the experimental banner is there and state that this is experimental
        const info = await PageObjects.visualize.getExperimentalInfo();
        expect(await info.getVisibleText()).to.contain('experimental');
      });

      it('should not show that notification for stable visualizations', async () => {
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        expect(await PageObjects.visualize.isExperimentalInfoShown()).to.be(false);
      });
    });

  });
};
