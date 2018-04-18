import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const remote = getService('remote');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const PageObjects = getPageObjects(['dashboard', 'common']);

  describe('full screen mode', async () => {
    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
    });

    it('option not available in edit mode', async () => {
      await PageObjects.dashboard.clickEdit();
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(false);
    });

    it('available in view mode', async () => {
      await PageObjects.dashboard.saveDashboard('full screen test', { saveAsNew: true });
      const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
      expect(exists).to.be(true);
    });

    it('hides the chrome', async () => {
      let isChromeVisible = await PageObjects.common.isChromeVisible();
      expect(isChromeVisible).to.be(true);

      await PageObjects.dashboard.clickFullScreenMode();

      await retry.try(async () => {
        isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(false);
      });
    });

    it('displays exit full screen logo button', async () => {
      const exists = await PageObjects.dashboard.exitFullScreenLogoButtonExists();
      expect(exists).to.be(true);
    });

    it('displays exit full screen logo button when panel is expanded', async () => {
      await dashboardPanelActions.toggleExpandPanel();

      const exists = await PageObjects.dashboard.exitFullScreenTextButtonExists();
      expect(exists).to.be(true);
    });

    it('exits when the text button is clicked on', async () => {
      const logoButton = await PageObjects.dashboard.getExitFullScreenLogoButton();
      await remote.moveMouseTo(logoButton);
      await PageObjects.dashboard.clickExitFullScreenTextButton();

      await retry.try(async () => {
        const isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);
      });
    });
  });
}
