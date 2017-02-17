import expect from 'expect.js';
import { bdd } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('dashboard save', function describeIndexTests() {
  const dashboardName = 'Dashboard Save Test';

  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('warns on duplicate name for new dashboard', async function() {
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

    // This is important since saving a new dashboard will cause a refresh of the page.  We have to
    // wait till it finishes reloading or it might reload the url after simulating the
    // dashboard landing page click.
    await PageObjects.header.waitUntilLoadingHasFinished();

    const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
    expect(countOfDashboards).to.equal(2);
  });

  bdd.it('Does not warn when saving a duplicate title that remains unchanged for an existing dashboard', async function() {
    await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
    await PageObjects.header.isGlobalLoadingIndicatorHidden();
    await PageObjects.dashboard.saveDashboard(dashboardName);

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(false);
  });

  bdd.it('Warns when saving a duplicate title that remains unchanged when Save as New Dashboard is checked', async function() {
    await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName, { saveAsNew: true });

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(true);

    await PageObjects.common.clickCancelOnModal();
  });

  bdd.it('Does not warn when only the prefix matches', async function() {
    await PageObjects.dashboard.saveDashboard(dashboardName.split(' ')[0]);

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(false);
  });

  bdd.it('Warns when case is different', async function() {
    await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName.toUpperCase());

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(true);

    await PageObjects.common.clickCancelOnModal();
  });
});
