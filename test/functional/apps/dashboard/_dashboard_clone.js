import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard save', function describeIndexTests() {
    const dashboardName = 'Dashboard Clone Test';
    const clonedDashboardName = dashboardName + ' Copy';

    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    it('Clone saves a copy', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

      await PageObjects.dashboard.clickClone();
      await PageObjects.dashboard.confirmClone();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(clonedDashboardName);
      expect(countOfDashboards).to.equal(1);
    });

    it('the copy should have all the same visualizations', async function () {
      await PageObjects.dashboard.loadSavedDashboard(clonedDashboardName);
      await retry.try(async () => {
        const panelTitles = await PageObjects.dashboard.getPanelTitles();
        expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
      });
    });

    it('clone warns on duplicate name', async function () {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      await PageObjects.dashboard.confirmClone();
      const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(true);
    });

    it('preserves the original title on cancel', async function () {
      await PageObjects.common.clickCancelOnModal();
      await PageObjects.dashboard.confirmClone();

      // Should see the same confirmation if the title is the same.
      const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(true);
    });

    it('and doesn\'t save', async() => {
      await PageObjects.common.clickCancelOnModal();
      await PageObjects.dashboard.cancelClone();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
      expect(countOfDashboards).to.equal(1);
    });

    it('Clones on confirm duplicate title warning', async function () {
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      await PageObjects.dashboard.clickClone();

      await PageObjects.dashboard.confirmClone();
      await PageObjects.common.clickConfirmOnModal();

      // This is important since saving a new dashboard will cause a refresh of the page.  We have to
      // wait till it finishes reloading or it might reload the url after simulating the
      // dashboard landing page click.
      await PageObjects.header.waitUntilLoadingHasFinished();

      const countOfDashboards =
        await PageObjects.dashboard.getDashboardCountWithName(dashboardName + ' Copy');
      expect(countOfDashboards).to.equal(2);
    });
  });
}
