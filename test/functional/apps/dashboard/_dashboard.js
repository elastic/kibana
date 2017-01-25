
import expect from 'expect.js';
import {
  DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT
} from '../../../../src/core_plugins/kibana/public/dashboard/panel/panel_state';

import { bdd } from '../../../support';
import PageObjects from '../../../support/page_objects';

bdd.describe('dashboard tab', function describeIndexTests() {
  bdd.before(async function () {
    return PageObjects.dashboard.initTests();
  });

  bdd.describe('add visualizations to dashboard', function dashboardTest() {

    bdd.it('should be able to add visualizations to dashboard', async function addVisualizations() {
      PageObjects.common.saveScreenshot('Dashboard-no-visualizations');

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.addVisualizations(PageObjects.dashboard.getTestVisualizationNames());

      PageObjects.common.debug('done adding visualizations');
      PageObjects.common.saveScreenshot('Dashboard-add-visualizations');
    });

    bdd.it('set the timepicker time to that which contains our test data', async function setTimepicker() {
      await PageObjects.dashboard.setTimepickerInDataRange();
    });

    bdd.it('should save and load dashboard', function saveAndLoadDashboard() {
      const dashboardName = 'Dashboard Test 1';
      // TODO: save time on the dashboard and test it
      return PageObjects.dashboard.saveDashboard(dashboardName)
        .then(() => PageObjects.dashboard.gotoDashboardLandingPage())
        // click New Dashboard just to clear the one we just created
        .then(function () {
          return PageObjects.common.try(function () {
            PageObjects.common.debug('saved Dashboard, now click New Dashboard');
            return PageObjects.dashboard.clickNewDashboard();
          });
        })
        .then(function () {
          return PageObjects.common.try(function () {
            PageObjects.common.debug('now re-load previously saved dashboard');
            return PageObjects.dashboard.loadSavedDashboard(dashboardName);
          });
        })
        .then(function () {
          PageObjects.common.saveScreenshot('Dashboard-load-saved');
        });
    });

    bdd.it('should have all the expected visualizations', function checkVisualizations() {
      return PageObjects.common.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelTitles()
          .then(function (panelTitles) {
            PageObjects.common.log('visualization titles = ' + panelTitles);
            expect(panelTitles).to.eql(PageObjects.dashboard.getTestVisualizationNames());
          });
      })
        .then(function () {
          PageObjects.common.saveScreenshot('Dashboard-has-visualizations');
        });
    });

    bdd.it('should have all the expected initial sizes', function checkVisualizationSizes() {
      const width = DEFAULT_PANEL_WIDTH;
      const height = DEFAULT_PANEL_HEIGHT;
      const visTitles = PageObjects.dashboard.getTestVisualizationNames();
      const visObjects = [
        { dataCol: '1', dataRow: '1', dataSizeX: width, dataSizeY: height, title: visTitles[0] },
        { dataCol: width + 1, dataRow: '1', dataSizeX: width, dataSizeY: height, title: visTitles[1] },
        { dataCol: '1', dataRow: height + 1, dataSizeX: width, dataSizeY: height, title: visTitles[2] },
        { dataCol: width + 1, dataRow: height + 1, dataSizeX: width, dataSizeY: height, title: visTitles[3] },
        { dataCol: '1', dataRow: (height * 2) + 1, dataSizeX: width, dataSizeY: height, title: visTitles[4] },
        { dataCol: width + 1, dataRow: (height * 2) + 1, dataSizeX: width, dataSizeY: height, title: visTitles[5] },
        { dataCol: '1', dataRow: (height * 3) + 1, dataSizeX: width, dataSizeY: height, title: visTitles[6] }
      ];
      return PageObjects.common.tryForTime(10000, function () {
        return PageObjects.dashboard.getPanelData()
          .then(function (panelTitles) {
            PageObjects.common.log('visualization titles = ' + panelTitles);
            PageObjects.common.saveScreenshot('Dashboard-visualization-sizes');
            expect(panelTitles).to.eql(visObjects);
          });
      });
    });
  });
});
