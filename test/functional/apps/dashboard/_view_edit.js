import expect from 'expect.js';

import { bdd } from '../../../support';
import PageObjects from '../../../support/page_objects';

const dashboardName = 'Dashboard View Edit Test';

bdd.describe('dashboard view edit mode', function viewEditModeTests() {
  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('create new dashboard opens in edit mode', async function () {
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.clickCancelOutOfEditMode();
  });

  bdd.it('create test dashboard', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
    await PageObjects.dashboard.saveDashboard(dashboardName);
  });

  bdd.it('open dashboard in view mode and click edit', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
    await PageObjects.dashboard.clickEdit();
  });

  bdd.it('save auto exits out of edit mode', async function () {
    await PageObjects.dashboard.saveDashboard(dashboardName);
    const isViewMode = await PageObjects.dashboard.getIsInViewMode();

    expect(isViewMode).to.equal(true);
  });

  bdd.describe('shows lose changes warning', async function () {
    bdd.describe('and loses changes on confirmation', function () {
      bdd.it('when time changed is stored with dashboard', async function () {
        await PageObjects.dashboard.clickEdit();
        const originalFromTime = '2015-09-19 06:31:44.000';
        const originalToTime = '2015-09-19 06:31:44.000';
        await PageObjects.header.setAbsoluteRange(originalFromTime, originalToTime);
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });

        await PageObjects.dashboard.clickEdit();
        await PageObjects.header.setAbsoluteRange('2013-09-19 06:31:44.000', '2013-09-19 06:31:44.000');
        await PageObjects.dashboard.clickCancelOutOfEditMode();

        // confirm lose changes
        await PageObjects.common.clickConfirmOnModal();

        const newFromTime = await PageObjects.header.getFromTime();
        const newToTime = await PageObjects.header.getToTime();

        expect(newFromTime).to.equal(originalFromTime);
        expect(newToTime).to.equal(originalToTime);
      });
    });

    bdd.describe('and preserves edits on cancel', function () {
      bdd.it('when time changed is stored with dashboard', async function () {
        await PageObjects.dashboard.clickEdit();
        const newFromTime = '2015-09-19 06:31:44.000';
        const newToTime = '2015-09-19 06:31:44.000';
        await PageObjects.header.setAbsoluteRange('2013-09-19 06:31:44.000', '2013-09-19 06:31:44.000');
        await PageObjects.dashboard.saveDashboard(dashboardName, true);
        await PageObjects.dashboard.clickEdit();
        await PageObjects.header.setAbsoluteRange(newToTime, newToTime);
        await PageObjects.dashboard.clickCancelOutOfEditMode();

        await PageObjects.common.clickCancelOnModal();
        await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: true });

        await PageObjects.dashboard.loadSavedDashboard(dashboardName);

        const fromTime = await PageObjects.header.getFromTime();
        const toTime = await PageObjects.header.getToTime();

        expect(fromTime).to.equal(newFromTime);
        expect(toTime).to.equal(newToTime);
      });
    });
  });

  bdd.describe('Does not show lose changes warning', async function () {
    bdd.it('when time changed is not stored with dashboard', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.saveDashboard(dashboardName, { storeTimeWithDashboard: false });
      await PageObjects.dashboard.clickEdit();
      await PageObjects.header.setAbsoluteRange('2013-10-19 06:31:44.000', '2013-12-19 06:31:44.000');
      await PageObjects.dashboard.clickCancelOutOfEditMode();

      const isOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isOpen).to.be(false);
    });

    bdd.it('when a dashboard has a filter and remains unchanged', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.dashboard.filterOnPieSlice();
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.clickCancelOutOfEditMode();

      const isOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isOpen).to.be(false);
    });
  });
});
