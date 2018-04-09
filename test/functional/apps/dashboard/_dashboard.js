import expect from 'expect.js';

import {
  VisualizeConstants
} from '../../../../src/core_plugins/kibana/public/visualize/visualize_constants';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const dashboardVisualizations = getService('dashboardVisualizations');
  const remote = getService('remote');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize', 'discover']);
  const testVisualizationTitles = [];
  const testVisualizationDescriptions = [];

  describe('dashboard tab', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('should be able to add visualizations to dashboard', async function addVisualizations() {
      await PageObjects.dashboard.clickNewDashboard();
      await dashboardVisualizations.createAndAddTSVBVisualization('TSVB');
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());
      await dashboardVisualizations.createAndAddSavedSearch({ name: 'saved search', fields: ['bytes', 'agent'] });
      testVisualizationTitles.push('TSVB');
      testVisualizationTitles.splice(1, 0, ...PageObjects.dashboard.getTestVisualizationNames());
      testVisualizationTitles.push('saved search');

      testVisualizationDescriptions.push('');
      testVisualizationDescriptions.splice(
        1, 0, ...PageObjects.dashboard.getTestVisualizations().map(visualization => visualization.description)
      );
      testVisualizationDescriptions.push('');
    });

    it('set the timepicker time to that which contains our test data', async function setTimepicker() {
      await PageObjects.dashboard.setTimepickerInDataRange();
    });

    it('saved search loaded with columns', async () => {
      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(3);
      expect(headers[1]).to.be('bytes');
      expect(headers[2]).to.be('agent');
    });

    it('should save and load dashboard', async function saveAndLoadDashboard() {
      const dashboardName = 'Dashboard Test 1';
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await retry.try(function () {
        log.debug('now re-load previously saved dashboard');
        return PageObjects.dashboard.loadSavedDashboard(dashboardName);
      });
    });

    it('should have all the expected visualizations', function checkVisualizations() {
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelTitles()
          .then(function (panelTitles) {
            expect(panelTitles).to.eql(testVisualizationTitles);
          });
      })
        .then(function () {
        });
    });

    it('retains dark theme in state', async function () {
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.useDarkTheme(true);
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();
      const isDarkThemeOn = await PageObjects.dashboard.isDarkThemeOn();
      expect(isDarkThemeOn).to.equal(true);
    });

    it('should have data-shared-items-count set to the number of visualizations', function checkSavedItemsCount() {
      return retry.tryForTime(10000, () => PageObjects.dashboard.getSharedItemsCount())
        .then(function (count) {
          log.info('data-shared-items-count = ' + count);
          expect(count).to.eql(testVisualizationTitles.length);
        });
    });

    it('should have panels with expected data-shared-item title and description', function () {
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelSharedItemData()
          .then(function (data) {
            expect(data.map(item => item.title)).to.eql(testVisualizationTitles);
            expect(data.map(item => item.description)).to.eql(testVisualizationDescriptions);
          });
      });
    });

    it('should be able to hide all panel titles', async function () {
      await PageObjects.dashboard.checkHideTitle();
      await retry.tryForTime(10000, async function () {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql('');
      });

    });

    it('should be able to unhide all panel titles', async function () {
      await PageObjects.dashboard.checkHideTitle();
      await retry.tryForTime(10000, async function () {
        const titles = await PageObjects.dashboard.getPanelTitles();
        expect(titles[0]).to.eql('TSVB');
      });
    });

    describe('expanding a panel', () => {
      it('hides other panels', async () => {
        // Don't expand TSVB since it doesn't have the spy panel.
        const panels = await PageObjects.dashboard.getDashboardPanels();
        await PageObjects.dashboard.toggleExpandPanel(panels[1]);
        await retry.try(async () => {
          const panels = await PageObjects.dashboard.getDashboardPanels();
          expect(panels.length).to.eql(1);
        });
      });

      it('does not show the spy pane toggle if mouse is not hovering', async () => {
        // move mouse off the panel.
        await PageObjects.header.clickTimepicker();
        await PageObjects.header.clickTimepicker();

        // no spy pane without hover
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(false);
      });

      it('shows the spy pane toggle on hover', async () => {
        const panels = await PageObjects.dashboard.getDashboardPanels();
        // Simulate hover
        await remote.moveMouseTo(panels[0]);
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      // This was an actual bug that appeared, where the spy pane appeared on panels after adding them, but
      // disappeared when a new dashboard was opened up.
      it('shows the spy pane toggle directly after opening a dashboard', async () => {
        await PageObjects.dashboard.saveDashboard('spy pane test');
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.loadSavedDashboard('spy pane test');
        const panels = await PageObjects.dashboard.getDashboardPanels();
        // Simulate hover
        await remote.moveMouseTo(panels[1]);
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('shows other panels after being minimized', async () => {
        // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
        await PageObjects.dashboard.toggleExpandPanel();
        await PageObjects.dashboard.toggleExpandPanel();

        // Add a retry to fix https://github.com/elastic/kibana/issues/14574.  Perhaps the recent changes to this
        // being a CSS update is causing the UI to change slower than grabbing the panels?
        retry.try(async () => {
          const panels = await PageObjects.dashboard.getDashboardPanels();
          expect(panels.length).to.eql(testVisualizationTitles.length);
        });
      });
    });

    describe('embed mode', () => {
      it('hides the chrome', async () => {
        let isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);

        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl + '&embed=true';
        // Embed parameter only works on a hard refresh.
        const useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);

        await retry.try(async () => {
          isChromeVisible = await PageObjects.common.isChromeVisible();
          expect(isChromeVisible).to.be(false);
        });
      });

      after(async function () {
        console.log('showing chrome again');
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl.replace('&embed=true', '');
        // First use the timestamp to cause a hard refresh so the new embed parameter works correctly.
        let useTimeStamp = true;
        await remote.get(newUrl.toString(), useTimeStamp);
        // Then get rid of the timestamp so the rest of the tests work with state and app switching.
        useTimeStamp = false;
        await remote.get(newUrl.toString(), useTimeStamp);
      });
    });

    describe('full screen mode', () => {
      it('option not available in edit mode', async () => {
        await PageObjects.dashboard.clickEdit();
        const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
        expect(exists).to.be(false);
      });

      it('available in view mode', async () => {
        await PageObjects.dashboard.saveDashboard('full screen test');
        const exists = await PageObjects.dashboard.fullScreenModeMenuItemExists();
        expect(exists).to.be(true);
      });

      it('hides the chrome', async () => {
        let isChromeVisible = await PageObjects.common.isChromeVisible();
        expect(isChromeVisible).to.be(true);

        await PageObjects.dashboard.clickFullScreenMode();

        await retry.try(async () => {
          isChromeVisible = await PageObjects.common.isChromeVisible();
          expect(isChromeVisible).to.be(false);
        });
      });

      it('displays exit full screen logo button', async () => {
        const exists = await PageObjects.dashboard.exitFullScreenLogoButtonExists();
        expect(exists).to.be(true);
      });

      it('displays exit full screen logo button when panel is expanded', async () => {
        await PageObjects.dashboard.toggleExpandPanel();

        const exists = await PageObjects.dashboard.exitFullScreenTextButtonExists();
        expect(exists).to.be(true);
      });

      it('exits when the text button is clicked on', async () => {
        const logoButton = await PageObjects.dashboard.getExitFullScreenLogoButton();
        await remote.moveMouseTo(logoButton);
        await PageObjects.dashboard.clickExitFullScreenTextButton();

        await retry.try(async () => {
          const isChromeVisible = await PageObjects.common.isChromeVisible();
          expect(isChromeVisible).to.be(true);
        });
      });


    });

    describe('add new visualization link', () => {
      it('adds a new visualization', async () => {
        await PageObjects.dashboard.clickEdit();
        await PageObjects.dashboard.clickAddVisualization();
        await PageObjects.dashboard.clickAddNewVisualizationLink();
        await PageObjects.visualize.clickAreaChart();
        await PageObjects.visualize.clickNewSearch();
        await PageObjects.visualize.saveVisualization('visualization from add new link');

        return retry.try(async () => {
          const panelCount = await PageObjects.dashboard.getPanelCount();
          expect(panelCount).to.eql(testVisualizationTitles.length + 1);
        });
      });

      it('saves the saved visualization url to the app link', async () => {
        await PageObjects.header.clickVisualize();
        const currentUrl = await remote.getCurrentUrl();
        expect(currentUrl).to.contain(VisualizeConstants.EDIT_PATH);
      });

      after(async () => {
        await PageObjects.header.clickDashboard();
      });
    });
  });
}
