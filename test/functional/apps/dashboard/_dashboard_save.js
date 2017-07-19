import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard save', function describeIndexTests() {
    const dashboardName = 'Dashboard Save Test';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('warns on duplicate name for new dashboard', async function () {
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await PageObjects.header.clickToastOK();

      let isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(false);

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

      isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(true);
    });

    it('does not save on reject confirmation', async function () {
      await PageObjects.common.clickCancelOnModal();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
      expect(countOfDashboards).to.equal(1);
    });

    it('Saves on confirm duplicate title warning', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

      await PageObjects.common.clickConfirmOnModal();
      await PageObjects.header.clickToastOK();

      // This is important since saving a new dashboard will cause a refresh of the page. We have to
      // wait till it finishes reloading or it might reload the url after simulating the
      // dashboard landing page click.
      await PageObjects.header.waitUntilLoadingHasFinished();

      const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
      expect(countOfDashboards).to.equal(2);
    });

    it('Does not warn when you save an existing dashboard with the title it already has, and that title is a duplicate',
      async function () {
        await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
        await PageObjects.header.isGlobalLoadingIndicatorHidden();
        await PageObjects.dashboard.clickEdit();
        await PageObjects.dashboard.saveDashboard(dashboardName);
        await PageObjects.header.clickToastOK();

        const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
        expect(isConfirmOpen).to.equal(false);
      }
    );

    it('Warns you when you Save as New Dashboard, and the title is a duplicate', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, { saveAsNew: true });

      const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(true);

      await PageObjects.common.clickCancelOnModal();
    });

    it('Does not warn when only the prefix matches', async function () {
      await PageObjects.dashboard.saveDashboard(dashboardName.split(' ')[0]);

      const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(false);
    });

    it('Warns when case is different', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName.toUpperCase());

      const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isConfirmOpen).to.equal(true);

      await PageObjects.common.clickCancelOnModal();
    });
  });
}
