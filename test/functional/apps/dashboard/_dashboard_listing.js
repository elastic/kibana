import expect from 'expect.js';

export default function ({ getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'header', 'common']);

  describe('dashboard listing page', function describeIndexTests() {
    const dashboardName = 'Dashboard Listing Test';

    before(async function () {
      await PageObjects.dashboard.initTests();
    });

    describe('create prompt', async () => {
      it('appears when there are no dashboards', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(true);
      });

      it('creates a new dashboard', async function () {
        await PageObjects.dashboard.clickCreateDashboardPrompt();
        await PageObjects.dashboard.saveDashboard(dashboardName);
        await PageObjects.header.clickToastOK();

        await PageObjects.dashboard.gotoDashboardLandingPage();
        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(1);
      });

      it('is not shown when there is a dashboard', async function () {
        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
      });

      it('is not shown when there are no dashboards shown during a search', async function () {
        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName('gobeldeguck');
        expect(countOfDashboards).to.equal(0);

        const promptExists = await PageObjects.dashboard.getCreateDashboardPromptExists();
        expect(promptExists).to.be(false);
      });
    });

    describe('delete', async function () {
      it('default confirm action is cancel', async function () {
        await PageObjects.dashboard.searchForDashboardWithName('');
        await PageObjects.dashboard.clickListItemCheckbox();
        await PageObjects.dashboard.clickDeleteSelectedDashboards();

        await PageObjects.common.pressEnterKey();

        const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
        expect(isConfirmOpen).to.be(false);

        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(1);
      });

      it('succeeds on confirmation press', async function () {
        await PageObjects.dashboard.clickListItemCheckbox();
        await PageObjects.dashboard.clickDeleteSelectedDashboards();

        await PageObjects.common.clickConfirmOnModal();

        const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
        expect(countOfDashboards).to.equal(0);
      });
    });
  });
}
