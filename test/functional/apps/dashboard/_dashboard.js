import expect from 'expect.js';

import {
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
} from '../../../../src/core_plugins/kibana/public/dashboard/panel/panel_state';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'dashboard', 'header', 'visualize']);


  describe('dashboard tab', function describeIndexTests() {
    before(async function () {
      return PageObjects.dashboard.initTests();
    });

    it('should be able to add visualizations to dashboard', async function addVisualizations() {
      await PageObjects.common.saveScreenshot('Dashboard-no-visualizations');

      // This flip between apps fixes the url so state is preserved when switching apps in test mode.
      // Without this flip the url in test mode looks something like
      // "http://localhost:5620/app/kibana?_t=1486069030837#/dashboard?_g=...."
      // after the initial flip, the url will look like this: "http://localhost:5620/app/kibana#/dashboard?_g=...."
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickDashboard();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());

      log.debug('done adding visualizations');
      await PageObjects.common.saveScreenshot('Dashboard-add-visualizations');
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
      await PageObjects.common.saveScreenshot('Dashboard-load-saved');
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
        PageObjects.common.saveScreenshot('Dashboard-has-visualizations');
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
            PageObjects.common.saveScreenshot('Dashboard-visualization-sizes');
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

    it('should have panels with expected data-shared-item title and description', function checkTitles() {
      const visualizations = PageObjects.dashboard.getTestVisualizations();
      return retry.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelSharedItemData()
        .then(function (data) {
          expect(data.map(item => item.title)).to.eql(visualizations.map(v => v.name));
          expect(data.map(item => item.description)).to.eql(visualizations.map(v => v.description));
        });
      });
    });

    it('add new visualization link', async function checkTitles() {
      await PageObjects.dashboard.clickAddVisualization();
      await PageObjects.dashboard.clickAddNewVisualizationLink();
      await PageObjects.visualize.clickAreaChart();
      await PageObjects.visualize.clickNewSearch();
      await PageObjects.visualize.saveVisualization('visualization from add new link');
      await PageObjects.header.clickToastOK();
      await PageObjects.header.clickToastOK();

      const visualizations = PageObjects.dashboard.getTestVisualizations();
      return retry.tryForTime(10000, async function () {
        const panelTitles = await PageObjects.dashboard.getPanelSizeData();
        log.info('visualization titles = ' + panelTitles.map(item => item.title));
        PageObjects.common.saveScreenshot('Dashboard-visualization-sizes');
        expect(panelTitles.length).to.eql(visualizations.length + 1);
      });
    });
  });
}
