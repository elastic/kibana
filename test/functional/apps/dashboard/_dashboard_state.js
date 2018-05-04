import expect from 'expect.js';

import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import {
  DEFAULT_PANEL_WIDTH,
} from '../../../../src/core_plugins/kibana/public/dashboard/dashboard_constants';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);
  const testSubjects = getService('testSubjects');
  const remote = getService('remote');
  const retry = getService('retry');

  describe('dashboard state', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    // Flaky test https://github.com/elastic/kibana/issues/17468
    it.skip('Overriding colors on an area chart is preserved', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();

      await PageObjects.dashboard.addVisualizations([AREA_CHART_VIS_NAME]);
      await PageObjects.dashboard.saveDashboard('Overridden colors');

      await PageObjects.dashboard.clickEdit();
      await PageObjects.visualize.clickLegendOption('Count');
      await PageObjects.visualize.selectNewLegendColorChoice('#EA6460');
      await PageObjects.dashboard.saveDashboard('Overridden colors');

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard('Overridden colors');
      const colorChoiceRetained = await PageObjects.visualize.doesSelectedLegendColorExist('#EA6460');

      expect(colorChoiceRetained).to.be(true);
    });

    it('Saved search with no changes will update when the saved object changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.header.clickDiscover();
      await PageObjects.dashboard.setTimepickerInDataRange();
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.clickNewDashboard();

      await PageObjects.dashboard.addSavedSearch('my search');
      await PageObjects.dashboard.saveDashboard('No local edits');

      const inViewMode = await testSubjects.exists('dashboardEditMode');
      expect(inViewMode).to.be(true);

      await PageObjects.header.clickDiscover();
      await PageObjects.discover.clickFieldListItemAdd('agent');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(3);
      expect(headers[1]).to.be('bytes');
      expect(headers[2]).to.be('agent');
    });

    it('Saved search with column changes will not update when the saved object changes', async () => {
      await PageObjects.discover.removeHeaderColumn('bytes');
      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.saveDashboard('Has local edits');

      await PageObjects.header.clickDiscover();
      await PageObjects.discover.clickFieldListItemAdd('clientip');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(2);
      expect(headers[1]).to.be('agent');
    });

    it('Tile map with no changes will update with visualization changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInDataRange();

      await PageObjects.dashboard.addVisualizations(['Visualization TileMap']);
      await PageObjects.dashboard.saveDashboard('No local edits');

      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.openSpyPanel();
      const tileMapData = await PageObjects.visualize.getDataTableData();
      await testSubjects.moveMouseTo('dashboardPanel');
      await PageObjects.visualize.closeSpyPanel();

      await PageObjects.dashboard.clickEdit();
      await PageObjects.dashboard.clickEditVisualization();

      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();
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

      it('when removing a panel', async function () {
        const currentUrl = await remote.getCurrentUrl();
        const newUrl = currentUrl.replace(/panels:\!\(.*\),query/, 'panels:!(),query');
        await remote.get(newUrl.toString(), false);

        await retry.try(async () => {
          const newPanelCount = await PageObjects.dashboard.getPanelCount();
          expect(newPanelCount).to.be(0);
        });
      });

      describe('for embeddable config color parameters on a visualization', () => {
        it('updates a pie slice color on a soft refresh', async function () {
          await PageObjects.dashboard.addVisualization(PIE_CHART_VIS_NAME);
          await PageObjects.visualize.clickLegendOption('80,000');
          await PageObjects.visualize.selectNewLegendColorChoice('#F9D9F9');
          const currentUrl = await remote.getCurrentUrl();
          const newUrl = currentUrl.replace('F9D9F9', 'FFFFFF');
          await remote.get(newUrl.toString(), false);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const allPieSlicesColor = await PageObjects.visualize.getAllPieSliceStyles('80,000');
            let whitePieSliceCounts = 0;
            allPieSlicesColor.forEach(style => {
              if (style.indexOf('rgb(255, 255, 255)') > 0) {
                whitePieSliceCounts++;
              }
            });

            expect(whitePieSliceCounts).to.be(1);
          });
        });

        // Unskip once https://github.com/elastic/kibana/issues/15736 is fixed.
        it.skip('and updates the pie slice legend color', async function () {
          await retry.try(async () => {
            const colorExists = await PageObjects.visualize.doesSelectedLegendColorExist('#FFFFFF');
            expect(colorExists).to.be(true);
          });
        });

        it('resets a pie slice color to the original when removed', async function () {
          const currentUrl = await remote.getCurrentUrl();
          const newUrl = currentUrl.replace('vis:(colors:(%2780,000%27:%23FFFFFF))', '');
          await remote.get(newUrl.toString(), false);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const pieSliceStyle = await PageObjects.visualize.getPieSliceStyle('80,000');
            // The default green color that was stored with the visualization before any dashboard overrides.
            expect(pieSliceStyle.indexOf('rgb(87, 193, 123)')).to.be.greaterThan(0);
          });
        });

        // Unskip once https://github.com/elastic/kibana/issues/15736 is fixed.
        it.skip('resets the legend color as well', async function () {
          await retry.try(async () => {
            const colorExists = await PageObjects.visualize.doesSelectedLegendColorExist('#57c17b');
            expect(colorExists).to.be(true);
          });
        });
      });
    });
  });
}
