import expect from 'expect.js';

import {
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
} from '../../../../src/core_plugins/kibana/public/dashboard/panel/panel_state';

import {
  VisualizeConstants
} from '../../../../src/core_plugins/kibana/public/visualize/visualize_constants';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const remote = getService('remote');
  const screenshots = getService('screenshots');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize']);

  describe('dashboard tab', function describeIndexTests() {
    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    after(async function () {
      // avoids any 'Object with id x not found' errors when switching tests.
      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.gotoLandingPage();
      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('should be able to add visualizations to dashboard', async function addVisualizations() {
      await screenshots.take('Dashboard-no-visualizations');

      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());

      log.debug('done adding visualizations');
      await screenshots.take('Dashboard-add-visualizations');
    });

    it('set the timepicker time to that which contains our test data', async function setTimepicker() {
      await PageObjects.dashboard.setTimepickerInDataRange();
    });

    it('should save and load dashboard', async function saveAndLoadDashboard() {
      const dashboardName = 'Dashboard Test 1';
      await PageObjects.dashboard.saveDashboard(dashboardName);
      await PageObjects.header.clickToastOK();
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await retry.try(function () {
        log.debug('now re-load previously saved dashboard');
        return PageObjects.dashboard.loadSavedDashboard(dashboardName);
      });
      await screenshots.take('Dashboard-load-saved');
    });

    it('should have all the expected visualizations', function checkVisualizations() {
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelTitles()
        .then(function (panelTitles) {
          log.info('visualization titles = ' + panelTitles);
          expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
        });
      })
      .then(function () {
        screenshots.take('Dashboard-has-visualizations');
      });
    });

    it('should have all the expected initial sizes', function checkVisualizationSizes() {
      const width = DEFAULT_PANEL_WIDTH;
      const height = DEFAULT_PANEL_HEIGHT;
      const titles = PageObjects.dashboard.getTestVisualizationNames();
      const visObjects = [
        { dataCol: '1', dataRow: '1', dataSizeX: width, dataSizeY: height, title: titles[0] },
        { dataCol: width + 1, dataRow: '1', dataSizeX: width, dataSizeY: height, title: titles[1] },
        { dataCol: '1', dataRow: height + 1, dataSizeX: width, dataSizeY: height, title: titles[2] },
        { dataCol: width + 1, dataRow: height + 1, dataSizeX: width, dataSizeY: height, title: titles[3] },
        { dataCol: '1', dataRow: (height * 2) + 1, dataSizeX: width, dataSizeY: height, title: titles[4] },
        { dataCol: width + 1, dataRow: (height * 2) + 1, dataSizeX: width, dataSizeY: height, title: titles[5] },
        { dataCol: '1', dataRow: (height * 3) + 1, dataSizeX: width, dataSizeY: height, title: titles[6] }
      ];
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelSizeData()
          .then(function (panelTitles) {
            log.info('visualization titles = ' + panelTitles);
            screenshots.take('Dashboard-visualization-sizes');
            expect(panelTitles).to.eql(visObjects);
          });
      });
    });

    describe('filters', async function () {
      it('are not selected by default', async function () {
        const filters = await PageObjects.dashboard.getFilters(1000);
        expect(filters.length).to.equal(0);
      });

      it('are added when a pie chart slice is clicked', async function () {
        await PageObjects.dashboard.filterOnPieSlice();
        const filters = await PageObjects.dashboard.getFilters();
        expect(filters.length).to.equal(1);
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
      const visualizations = PageObjects.dashboard.getTestVisualizations();
      return retry.tryForTime(10000, () => PageObjects.dashboard.getSharedItemsCount())
      .then(function (count) {
        log.info('data-shared-items-count = ' + count);
        expect(count).to.eql(visualizations.length);
      });
    });

    it('should have panels with expected data-shared-item title and description', function () {
      const visualizations = PageObjects.dashboard.getTestVisualizations();
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelSharedItemData()
        .then(function (data) {
          expect(data.map(item => item.title)).to.eql(visualizations.map(v => v.name));
          expect(data.map(item => item.description)).to.eql(visualizations.map(v => v.description));
        });
      });
    });

    describe('Directly modifying url updates dashboard state', () => {
      it('for query parameter', async function () {
        const currentQuery = await PageObjects.dashboard.getQuery();
        expect(currentQuery).to.equal('');
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl.replace('query:%27%27', 'query:%27hi%27');
        // Don't add the timestamp to the url or it will cause a hard refresh and we want to test a
        // soft refresh.
        await remote.get(newUrl.toString(), false);
        const newQuery = await PageObjects.dashboard.getQuery();
        expect(newQuery).to.equal('hi');
      });

      it('for panel size parameters', async function () {
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl.replace(`size_x:${DEFAULT_PANEL_WIDTH}`, `size_x:${DEFAULT_PANEL_WIDTH * 2}`);
        await remote.get(newUrl.toString(), false);
        const allPanelInfo = await PageObjects.dashboard.getPanelSizeData();
        expect(allPanelInfo[0].dataSizeX).to.equal(`${DEFAULT_PANEL_WIDTH * 2}`);
      });
    });

    describe('expanding a panel', () => {
      it('hides other panels', async () => {
        await PageObjects.dashboard.toggleExpandPanel();
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
        await remote.moveMouseTo(panels[0]);
        const spyToggleExists = await PageObjects.visualize.getSpyToggleExists();
        expect(spyToggleExists).to.be(true);
      });

      it('shows other panels after being minimized', async () => {
        // Panels are all minimized on a fresh open of a dashboard, so we need to re-expand in order to then minimize.
        await PageObjects.dashboard.toggleExpandPanel();
        await PageObjects.dashboard.toggleExpandPanel();
        const panels = await PageObjects.dashboard.getDashboardPanels();
        const visualizations = PageObjects.dashboard.getTestVisualizations();
        expect(panels.length).to.eql(visualizations.length);
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
        await PageObjects.header.clickToastOK();

        const visualizations = PageObjects.dashboard.getTestVisualizations();
        return retry.tryForTime(10000, async function () {
          const panelTitles = await PageObjects.dashboard.getPanelSizeData();
          log.info('visualization titles = ' + panelTitles.map(item => item.title));
          screenshots.take('Dashboard-visualization-sizes');
          expect(panelTitles.length).to.eql(visualizations.length + 1);
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
