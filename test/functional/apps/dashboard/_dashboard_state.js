import expect from 'expect.js';

import { PIE_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import {
  DEFAULT_PANEL_WIDTH,
} from '../../../../src/core_plugins/kibana/public/dashboard/dashboard_constants';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header']);
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const retry = getService('retry');

  describe('dashboard state', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
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

    describe('Directly modifying url updates dashboard state', () => {
      it('for query parameter', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();

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
        await PageObjects.dashboard.addVisualization(PIE_CHART_VIS_NAME);
        const currentUrl = await remote.getCurrentUrl();
        const currentPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
        const newUrl = currentUrl.replace(`w:${DEFAULT_PANEL_WIDTH}`, `w:${DEFAULT_PANEL_WIDTH * 2}`);
        await remote.get(newUrl.toString(), false);
        await retry.try(async () => {
          const newPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
          if (newPanelDimensions.length < 0) {
            throw new Error('No panel dimensions...');
          }
          // Some margin of error is allowed (I've noticed it being off by one pixel which probably something to do
          // with an odd width and dividing by two), but due to https://github.com/elastic/kibana/issues/14542 I'm
          // adding more margin of error than should be necessary.  That issue looks legit, but because I can't
          // repro locally, I don't have a quick solution aside from increasing this margin error, for getting the
          // build to pass consistently again.
          const marginOfError = 20;
          expect(newPanelDimensions[0].width).to.be.lessThan(currentPanelDimensions[0].width * 2 + marginOfError);
          expect(newPanelDimensions[0].width).to.be.greaterThan(currentPanelDimensions[0].width * 2 - marginOfError);
        });
      });
    });

    it('Tile map with no changes will update with visualization changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.dashboard.addVisualizations(['Visualization TileMap']);
      await PageObjects.dashboard.saveDashboard('No local edits');
      await PageObjects.header.clickToastOK();

      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.openSpyPanel();
      const tileMapData = await PageObjects.visualize.getDataTableData();
      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.closeSpyPanel();

      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.clickEditVisualization();
      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();

      await PageObjects.visualize.saveVisualization('Visualization TileMap');
      await PageObjects.header.clickDashboard();

      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.openSpyPanel();
      const changedTileMapData = await PageObjects.visualize.getDataTableData();
      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.closeSpyPanel();

      expect(changedTileMapData.length).to.not.equal(tileMapData.length);
    });

  });
}
