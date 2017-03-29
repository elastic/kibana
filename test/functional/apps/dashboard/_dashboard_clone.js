import expect from 'expect.js';
import { bdd } from '../../../support';

import { DASHBOARD_TITLE_CLONE_SUFFIX } from '../../../../src/core_plugins/kibana/public/dashboard/dashboard_strings';
import PageObjects from '../../../support/page_objects';

bdd.describe('dashboard save', function describeIndexTests() {
  const dashboardName = 'Dashboard Clone Test';
  const clonedDashboardName = dashboardName + DASHBOARD_TITLE_CLONE_SUFFIX;

  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('Clone saves a copy', async function () {
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
    await PageObjects.dashboard.enterDashboardTitleAndClickSave(dashboardName);

    await PageObjects.dashboard.clickClone();

    const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(clonedDashboardName);
    expect(countOfDashboards).to.equal(1);
  });

  bdd.it('the copy should have all the same visualizations', async function () {
    await PageObjects.dashboard.loadSavedDashboard(clonedDashboardName);
    return PageObjects.common.try(async function () {
      const panelTitles = await PageObjects.dashboard.getPanelTitles();
      expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
    });
  });

  bdd.it('clone warns on duplicate name', async function() {
    await PageObjects.dashboard.loadSavedDashboard(dashboardName);
    await PageObjects.dashboard.clickClone();

    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(true);
  });

  bdd.it('preserves the original title on cancel', async function() {
    await PageObjects.common.clickCancelOnModal();
    await PageObjects.dashboard.clickClone();

    // Should see the same confirmation if the title is the same.
    const isConfirmOpen = await PageObjects.common.isConfirmModalOpen();
    expect(isConfirmOpen).to.equal(true);
  });

  bdd.it('and doesn\'t save', async () => {
    await PageObjects.common.clickCancelOnModal();

    const countOfDashboards = await PageObjects.dashboard.getDashboardCountWithName(dashboardName);
    expect(countOfDashboards).to.equal(1);
  });

  bdd.it('Clones on confirm duplicate title warning', async function() {
    await PageObjects.dashboard.loadSavedDashboard(dashboardName);
    await PageObjects.dashboard.clickClone();

    await PageObjects.common.clickConfirmOnModal();

    // This is important since saving a new dashboard will cause a refresh of the page.  We have to
    // wait till it finishes reloading or it might reload the url after simulating the
    // dashboard landing page click.
    await PageObjects.header.waitUntilLoadingHasFinished();

    const countOfDashboards =
      await PageObjects.dashboard.getDashboardCountWithName(dashboardName + DASHBOARD_TITLE_CLONE_SUFFIX);
    expect(countOfDashboards).to.equal(2);
  });
});
