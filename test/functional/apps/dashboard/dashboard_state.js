/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import {
  DEFAULT_PANEL_WIDTH,
} from '../../../../src/legacy/core_plugins/kibana/public/dashboard/dashboard_constants';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['dashboard', 'visualize', 'header', 'discover']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard state', function describeIndexTests() {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('Overriding colors on an area chart is preserved', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();

      await dashboardAddPanel.addVisualization(AREA_CHART_VIS_NAME);
      await PageObjects.dashboard.saveDashboard('Overridden colors');

      await PageObjects.dashboard.switchToEditMode();

      await PageObjects.visualize.openLegendOptionColors('Count');
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
      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
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
      await PageObjects.dashboard.switchToEditMode();
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

    it('Saved search will update when the query is changed in the URL', async () => {
      const currentQuery = await queryBar.getQueryString();
      expect(currentQuery).to.equal('');
      const currentUrl = await browser.getCurrentUrl();
      const newUrl = currentUrl.replace('query:%27%27', 'query:%27abc12345678910%27');
      // Don't add the timestamp to the url or it will cause a hard refresh and we want to test a
      // soft refresh.
      await browser.get(newUrl.toString(), false);
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(0);
    });

    it('Tile map with no changes will update with visualization changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.setTimepickerInHistoricalDataRange();

      await dashboardAddPanel.addVisualization('Visualization TileMap');
      await PageObjects.dashboard.saveDashboard('No local edits');

      await dashboardPanelActions.openInspector();
      const tileMapData = await inspector.getTableData();
      await inspector.close();

      await PageObjects.dashboard.switchToEditMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();

      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();
      await PageObjects.visualize.clickMapZoomIn();

      await PageObjects.visualize.saveVisualizationExpectSuccess('Visualization TileMap');

      await PageObjects.header.clickDashboard();

      await dashboardPanelActions.openInspector();
      const changedTileMapData = await inspector.getTableData();
      await inspector.close();
      expect(changedTileMapData.length).to.not.equal(tileMapData.length);
    });

    describe('Directly modifying url updates dashboard state', () => {
      it('for query parameter', async function () {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();

        const currentQuery = await queryBar.getQueryString();
        expect(currentQuery).to.equal('');
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl.replace('query:%27%27', 'query:%27hi%27');
        // Don't add the timestamp to the url or it will cause a hard refresh and we want to test a
        // soft refresh.
        await browser.get(newUrl.toString(), false);
        const newQuery = await queryBar.getQueryString();
        expect(newQuery).to.equal('hi');
      });

      it('for panel size parameters', async function () {
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        const currentUrl = await browser.getCurrentUrl();
        const currentPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
        const newUrl = currentUrl.replace(`w:${DEFAULT_PANEL_WIDTH}`, `w:${DEFAULT_PANEL_WIDTH * 2}`);
        await browser.get(newUrl.toString(), false);
        await retry.try(async () => {
          const newPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
          if (newPanelDimensions.length < 0) {
            throw new Error('No panel dimensions...');
          }

          await PageObjects.dashboard.waitForRenderComplete();
          // Add a "margin" of error  - because of page margins, it won't be a straight doubling of width.
          const marginOfError = 10;
          expect(newPanelDimensions[0].width).to.be.lessThan(currentPanelDimensions[0].width * 2 + marginOfError);
          expect(newPanelDimensions[0].width).to.be.greaterThan(currentPanelDimensions[0].width * 2 - marginOfError);
        });
      });

      it('when removing a panel', async function () {
        const currentUrl = await browser.getCurrentUrl();
        const newUrl = currentUrl.replace(/panels:\!\(.*\),query/, 'panels:!(),query');
        await browser.get(newUrl.toString(), false);

        await retry.try(async () => {
          const newPanelCount = await PageObjects.dashboard.getPanelCount();
          expect(newPanelCount).to.be(0);
        });
      });

      describe('for embeddable config color parameters on a visualization', () => {
        it('updates a pie slice color on a soft refresh', async function () {
          await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
          await PageObjects.visualize.openLegendOptionColors('80,000');
          await PageObjects.visualize.selectNewLegendColorChoice('#F9D9F9');
          const currentUrl = await browser.getCurrentUrl();
          const newUrl = currentUrl.replace('F9D9F9', 'FFFFFF');
          await browser.get(newUrl.toString(), false);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const allPieSlicesColor = await pieChart.getAllPieSliceStyles('80,000');
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
          const currentUrl = await browser.getCurrentUrl();
          const newUrl = currentUrl.replace('vis:(colors:(%2780,000%27:%23FFFFFF))', '');
          await browser.get(newUrl.toString(), false);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const pieSliceStyle = await pieChart.getPieSliceStyle('80,000');
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
