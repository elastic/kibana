import expect from 'expect.js';

import { bdd } from '../../../support';
import PageObjects from '../../../support/page_objects';

const dashboardName = 'Dashboard View Edit Test';

bdd.describe('dashboard view edit mode', function viewEditModeTests() {
  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.it('create new dashboard opens in edit mode', async function () {
    // This flip between apps fixes the url so state is preserved when switching apps in test mode.
    // Without this flip the url in test mode looks something like
    // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
    // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
    await PageObjects.header.clickVisualize();
    await PageObjects.header.clickDashboard();

    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.clickCancelOutOfEditMode();
  });

  bdd.it('create test dashboard', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickNewDashboard();
    await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
    await PageObjects.dashboard.saveDashboard(dashboardName);
  });

  bdd.it('existing dashboard opens in view mode', async function () {
    await PageObjects.dashboard.gotoDashboardLandingPage();
    await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);
    const inViewMode = await PageObjects.dashboard.getIsInViewMode();

    expect(inViewMode).to.equal(true);
  });

  bdd.describe('panel edit controls', function () {
    bdd.it('are hidden in view mode', async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickDashboardByLinkText(dashboardName);

      const editLinkExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelEditLink');
      const moveExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelMoveIcon');
      const removeExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelRemoveIcon');

      expect(editLinkExists).to.equal(false);
      expect(moveExists).to.equal(false);
      expect(removeExists).to.equal(false);
    });

    bdd.it('are shown in edit mode', async function () {
      await PageObjects.dashboard.clickEdit();

      const editLinkExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelEditLink');
      const moveExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelMoveIcon');
      const removeExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelRemoveIcon');

      expect(editLinkExists).to.equal(true);
      expect(moveExists).to.equal(true);
      expect(removeExists).to.equal(true);
    });

    bdd.describe('on an expanded panel', function () {
      bdd.it('are hidden in view mode', async function () {
        await PageObjects.dashboard.saveDashboard(dashboardName);
        await PageObjects.dashboard.toggleExpandPanel();

        const editLinkExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelEditLink');
        const moveExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelMoveIcon');
        const removeExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelRemoveIcon');

        expect(editLinkExists).to.equal(false);
        expect(moveExists).to.equal(false);
        expect(removeExists).to.equal(false);
      });

      bdd.it('in edit mode hides move and remove icons ', async function () {
        await PageObjects.dashboard.clickEdit();

        const editLinkExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelEditLink');
        const moveExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelMoveIcon');
        const removeExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelRemoveIcon');

        expect(editLinkExists).to.equal(true);
        expect(moveExists).to.equal(false);
        expect(removeExists).to.equal(false);

        await PageObjects.dashboard.toggleExpandPanel();
      });
    });
  });

  // Panel expand should also be shown in view mode, but only on mouse hover.
  bdd.describe('panel expand control shown in edit mode', async function () {
    const expandExists = await PageObjects.common.doesTestSubjectExist('dashboardPanelExpandIcon');
    expect(expandExists).to.equal(true);
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

      bdd.it('when the query is edited and applied', async function () {
        await PageObjects.dashboard.clickEdit();

        const originalQuery = await PageObjects.dashboard.getQuery();
        await PageObjects.dashboard.appendQuery('extra stuff');
        await PageObjects.dashboard.clickFilterButton();

        await PageObjects.dashboard.clickCancelOutOfEditMode();

        // confirm lose changes
        await PageObjects.common.clickConfirmOnModal();

        const query = await PageObjects.dashboard.getQuery();
        expect(query).to.equal(originalQuery);
      });

      bdd.it('when a filter is deleted', async function () {
        await PageObjects.dashboard.clickEdit();
        await PageObjects.dashboard.setTimepickerInDataRange();
        await PageObjects.dashboard.filterOnPieSlice();
        await PageObjects.dashboard.saveDashboard(dashboardName);

        // This may seem like a pointless line but there was a bug that only arose when the dashboard
        // was loaded initially
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        await PageObjects.dashboard.clickEdit();

        const originalFilters = await PageObjects.dashboard.getFilters();

        // Click to cause hover menu to show up, but it will also actually click the filter, which will turn
        // it off, so we need to click twice to turn it back on.
        await originalFilters[0].click();
        await originalFilters[0].click();

        const removeFilterButton = await PageObjects.common.findTestSubject('removeFilter-memory');
        await removeFilterButton.click();

        const noFilters = await PageObjects.dashboard.getFilters(1000);
        expect(noFilters.length).to.equal(0);

        await PageObjects.dashboard.clickCancelOutOfEditMode();

        // confirm lose changes
        await PageObjects.common.clickConfirmOnModal();

        const reloadedFilters = await PageObjects.dashboard.getFilters();
        expect(reloadedFilters.length).to.equal(1);
      });

      bdd.it('when a new vis is added', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        await PageObjects.dashboard.clickEdit();

        await PageObjects.dashboard.clickAddVisualization();
        await PageObjects.dashboard.clickAddNewVisualizationLink();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualization('new viz panel');

        await PageObjects.dashboard.clickCancelOutOfEditMode();

        // confirm lose changes
        await PageObjects.common.clickConfirmOnModal();

        const visualizations = PageObjects.dashboard.getTestVisualizations();
        const panelTitles = await PageObjects.dashboard.getPanelSizeData();
        expect(panelTitles.length).to.eql(visualizations.length);
      });

      bdd.it('when an existing vis is added', async function () {
        await PageObjects.dashboard.loadSavedDashboard(dashboardName);
        await PageObjects.dashboard.clickEdit();

        await PageObjects.dashboard.addVisualization('new viz panel');
        await PageObjects.dashboard.clickCancelOutOfEditMode();

        // confirm lose changes
        await PageObjects.common.clickConfirmOnModal();

        const visualizations = PageObjects.dashboard.getTestVisualizations();
        const panelTitles = await PageObjects.dashboard.getPanelSizeData();
        expect(panelTitles.length).to.eql(visualizations.length);
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

    // See https://github.com/elastic/kibana/issues/10110 - this is intentional.
    bdd.it('when the query is edited but not applied', async function () {
      await PageObjects.dashboard.clickEdit();

      const originalQuery = await PageObjects.dashboard.getQuery();
      await PageObjects.dashboard.appendQuery('extra stuff');

      await PageObjects.dashboard.clickCancelOutOfEditMode();

      const isOpen = await PageObjects.common.isConfirmModalOpen();
      expect(isOpen).to.be(false);

      await PageObjects.dashboard.loadSavedDashboard(dashboardName);
      const query = await PageObjects.dashboard.getQuery();
      expect(query).to.equal(originalQuery);
    });
  });
});
