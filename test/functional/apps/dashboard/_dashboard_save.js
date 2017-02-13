import expect from 'expect.js';
import { bdd } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('dashboard save', function describeIndexTests() {
  const dashboardName = 'Dashboard Save Test';

  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('warns on duplicate name', async function() {
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.saveDashboard(dashboardName);

    let isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(false);

    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

    isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(true);
  });

  bdd.it('does not save on reject confirmation', async function() {
    await PageObjects.common.clickCancelOnModal();

    const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
    expect(countOfDashboards).to.equal(1);

  });

  bdd.it('Saves on confirm duplicate title warning', async function() {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

    await PageObjects.common.clickConfirmOnModal();

    const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
    expect(countOfDashboards).to.equal(2);
  });

  bdd.it('Does not warn when saving a duplicate title that remains unchanged', async function() {
    await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.dashboard.saveDashboard(dashboardName);

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(false);
  });
});
