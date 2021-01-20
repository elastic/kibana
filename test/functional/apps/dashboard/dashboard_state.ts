/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import expect from '@kbn/expect';

import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { DEFAULT_PANEL_WIDTH } from '../../../../src/plugins/dashboard/public/application/embeddable/dashboard_constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'dashboard',
    'visualize',
    'header',
    'discover',
    'tileMap',
    'visChart',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const inspector = getService('inspector');
  const retry = getService('retry');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('dashboard state', function describeIndexTests() {
    // Used to track flag before and after reset
    let isNewChartsLibraryEnabled = false;

    before(async function () {
      isNewChartsLibraryEnabled = await PageObjects.visChart.isNewChartsLibraryEnabled();
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();

      if (isNewChartsLibraryEnabled) {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyChartsLibrary': false,
        });
        await browser.refresh();
      }
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    it('Overriding colors on an area chart is preserved', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();

      const visName = await PageObjects.visChart.getExpectedValue(
        AREA_CHART_VIS_NAME,
        `${AREA_CHART_VIS_NAME} - new charts library`
      );
      await dashboardAddPanel.addVisualization(visName);
      const dashboarName = await PageObjects.visChart.getExpectedValue(
        'Overridden colors',
        'Overridden colors - new charts library'
      );
      await PageObjects.dashboard.saveDashboard(dashboarName);

      await PageObjects.dashboard.switchToEditMode();
      await queryBar.clickQuerySubmitButton();

      await PageObjects.visChart.openLegendOptionColors('Count', `[data-title="${visName}"]`);
      await PageObjects.visChart.selectNewLegendColorChoice('#EA6460');

      await PageObjects.dashboard.saveDashboard(dashboarName);

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard(dashboarName);

      if (await PageObjects.visChart.isNewChartsLibraryEnabled()) {
        await elasticChart.setNewChartUiDebugFlag();
        await queryBar.submitQuery();
      }

      const colorChoiceRetained = await PageObjects.visChart.doesSelectedLegendColorExist(
        '#EA6460'
      );

      expect(colorChoiceRetained).to.be(true);
    });

    it('Saved search with no changes will update when the saved object changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.header.clickDiscover();
      await PageObjects.timePicker.setHistoricalDataRange();
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
      // will be zero because the query inserted in the url doesn't match anything
      expect(headers.length).to.be(0);
    });

    it('Tile map with no changes will update with visualization changes', async () => {
      await PageObjects.dashboard.gotoDashboardLandingPage();

      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.timePicker.setHistoricalDataRange();

      await dashboardAddPanel.addVisualization('Visualization TileMap');
      await PageObjects.dashboard.saveDashboard('No local edits');

      await dashboardPanelActions.openInspector();
      const tileMapData = await inspector.getTableData();
      await inspector.close();

      await PageObjects.dashboard.switchToEditMode();
      await dashboardPanelActions.openContextMenu();
      await dashboardPanelActions.clickEdit();

      await PageObjects.tileMap.clickMapZoomIn();
      await PageObjects.tileMap.clickMapZoomIn();
      await PageObjects.tileMap.clickMapZoomIn();
      await PageObjects.tileMap.clickMapZoomIn();

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
    });
  });
}
