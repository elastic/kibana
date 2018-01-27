import expect from 'expect.js';

import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import {
  VisualizeConstants
} from '../../../../src/core_plugins/kibana/public/visualize/visualize_constants';

export default function ({ getService, getPageObjects }) {
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['dashboard', 'header', 'visualize', 'discover']);
  const dashboardName = 'Dashboard Panel Controls Test';

  describe('dashboard panel controls', function viewEditModeTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await kibanaServer.uiSettings.disableToastAutohide();
      await remote.refresh();

      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    describe('panel edit controls', function () {
      before(async () => {
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.dashboard.setTimepickerInDataRange();
        await PageObjects.dashboard.addVisualization(PIE_CHART_VIS_NAME);
      });

      it('are hidden in view mode', async function () {
        await PageObjects.dashboard.saveDashboard(dashboardName);
        const panelToggleMenu = await testSubjects.exists('dashboardPanelToggleMenuIcon');
        expect(panelToggleMenu).to.equal(false);
      });

      it('are shown in edit mode', async function () {
        await PageObjects.dashboard.clickEdit();

        const panelToggleMenu = await testSubjects.exists('dashboardPanelToggleMenuIcon');
        expect(panelToggleMenu).to.equal(true);
        await testSubjects.click('dashboardPanelToggleMenuIcon');
        const editLinkExists = await testSubjects.exists('dashboardPanelEditLink');
        const removeExists = await testSubjects.exists('dashboardPanelRemoveIcon');

        expect(editLinkExists).to.equal(true);
        expect(removeExists).to.equal(true);
      });

      // Based off an actual bug encountered in a PR where a hard refresh in edit mode did not show the edit mode
      // controls.
      it('are shown in edit mode after a hard refresh', async () => {
        const currentUrl = await remote.getCurrentUrl();
        // the second parameter of true will include the timestamp in the url and trigger a hard refresh.
        await remote.get(currentUrl.toString(), true);
        await PageObjects.header.waitUntilLoadingHasFinished();

        await PageObjects.dashboard.showPanelEditControlsDropdownMenu();
        const editLinkExists = await testSubjects.exists('dashboardPanelEditLink');
        expect(editLinkExists).to.equal(true);

        const removeExists = await testSubjects.exists('dashboardPanelRemoveIcon');
        expect(removeExists).to.equal(true);

        // Get rid of the timestamp in the url.
        await remote.get(currentUrl.toString(), false);
      });

      describe('on an expanded panel', function () {
        it('are hidden in view mode', async function () {
          await PageObjects.dashboard.saveDashboard(dashboardName);
          await PageObjects.dashboard.toggleExpandPanel();

          const panelToggleMenu = await testSubjects.exists('dashboardPanelToggleMenuIcon');
          expect(panelToggleMenu).to.equal(false);
        });

        it('in edit mode hides remove icons ', async function () {
          await PageObjects.dashboard.clickEdit();

          const panelToggleMenu = await testSubjects.exists('dashboardPanelToggleMenuIcon');
          expect(panelToggleMenu).to.equal(true);
          await testSubjects.click('dashboardPanelToggleMenuIcon');
          const editLinkExists = await testSubjects.exists('dashboardPanelEditLink');
          const removeExists = await testSubjects.exists('dashboardPanelRemoveIcon');

          expect(editLinkExists).to.equal(true);
          expect(removeExists).to.equal(false);

          await PageObjects.dashboard.toggleExpandPanel();
        });
      });

      describe('visualization object edit menu', () => {
        it('opens a visualization when edit link is clicked', async () => {
          await testSubjects.click('dashboardPanelToggleMenuIcon');
          await PageObjects.dashboard.clickDashboardPanelEditLink();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const currentUrl = await remote.getCurrentUrl();
          expect(currentUrl).to.contain(VisualizeConstants.EDIT_PATH);
        });

        it('deletes the visualization when delete link is clicked', async () => {
          await PageObjects.header.clickDashboard();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.dashboard.clickDashboardPanelRemoveIcon();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(0);
        });
      });

      describe('saved search object edit menu', () => {
        before(async () => {
          await PageObjects.header.clickDiscover();
          await PageObjects.discover.clickFieldListItemAdd('bytes');
          await PageObjects.discover.saveSearch('my search');
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.header.clickDashboard();
          await PageObjects.dashboard.addSavedSearch('my search');

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(1);
        });

        it('opens a saved search when edit link is clicked', async () => {
          await PageObjects.dashboard.clickDashboardPanelEditLink();
          await PageObjects.header.waitUntilLoadingHasFinished();
          const queryName = await PageObjects.discover.getCurrentQueryName();
          expect(queryName).to.be('my search');
        });

        it('deletes the saved search when delete link is clicked', async () => {
          await PageObjects.header.clickDashboard();
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.dashboard.clickDashboardPanelRemoveIcon();

          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.be(0);
        });
      });
    });

    // Panel expand should also be shown in view mode, but only on mouse hover.
    describe('panel expand control', function () {
      it('shown in edit mode', async function () {
        await PageObjects.dashboard.gotoDashboardEditMode(dashboardName);
        await testSubjects.click('dashboardPanelToggleMenuIcon');
        const expandExists = await testSubjects.exists('dashboardPanelExpandIcon');
        expect(expandExists).to.equal(true);
      });
    });
  });
}
