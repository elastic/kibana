import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard']);

  describe('dashboard data-shared attributes', async () => {
    let originalTitles = [];

    before(async () => {
      await PageObjects.dashboard.loadSavedDashboard('few panels');
      await PageObjects.dashboard.clickEdit();
      originalTitles = await PageObjects.dashboard.getPanelTitles();
    });

    it('should be able to hide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql('');
      });
    });

    it('should be able to unhide all panel titles', async () => {
      await PageObjects.dashboard.checkHideTitle();
      await retry.try(async () => {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql(originalTitles[0]);
      });
    });
  });
}
