/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import chroma from 'chroma-js';

import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../page_objects/dashboard_page';
import { DEFAULT_PANEL_WIDTH } from '../../../../src/plugins/dashboard/public/application/embeddable/dashboard_constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'dashboard',
    'visualize',
    'header',
    'discover',
    'visChart',
    'share',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const retry = getService('retry');
  const elasticChart = getService('elasticChart');
  const kibanaServer = getService('kibanaServer');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const xyChartSelector = 'visTypeXyChart';

  const enableNewChartLibraryDebug = async (force = false) => {
    if ((await PageObjects.visChart.isNewChartsLibraryEnabled()) || force) {
      await elasticChart.setNewChartUiDebugFlag();
      await queryBar.submitQuery();
    }
  };

  describe('dashboard state', function describeIndexTests() {
    // Used to track flag before and after reset
    let isNewChartsLibraryEnabled = false;

    before(async function () {
      isNewChartsLibraryEnabled = await PageObjects.visChart.isNewChartsLibraryEnabled();
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();

      if (isNewChartsLibraryEnabled) {
        await kibanaServer.uiSettings.update({
          'visualization:visualize:legacyPieChartsLibrary': false,
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

      const visName = AREA_CHART_VIS_NAME;
      await dashboardAddPanel.addVisualization(visName);
      const dashboardName = 'Overridden colors - new charts library';
      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.switchToEditMode();
      await queryBar.clickQuerySubmitButton();

      await PageObjects.visChart.openLegendOptionColorsForXY('Count', `[data-title="${visName}"]`);
      const overwriteColor = '#d36086';
      await PageObjects.visChart.selectNewLegendColorChoice(overwriteColor);

      await PageObjects.dashboard.saveDashboard(dashboardName);

      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.loadSavedDashboard(dashboardName);

      await enableNewChartLibraryDebug(true);

      const colorChoiceRetained = await PageObjects.visChart.doesSelectedLegendColorExistForXY(
        overwriteColor,
        xyChartSelector
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
      await PageObjects.dashboard.switchToEditMode();
      await PageObjects.discover.removeHeaderColumn('bytes');
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
      const currentUrl = await getUrlFromShare();
      const newUrl = currentUrl.replace(`query:''`, `query:'abc12345678910'`);

      // We need to add a timestamp to the URL because URL changes now only work with a hard refresh.
      await browser.get(newUrl.toString());
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      // will be zero because the query inserted in the url doesn't match anything
      expect(headers.length).to.be(0);
    });

    const getUrlFromShare = async () => {
      await PageObjects.share.clickShareTopNavButton();
      const sharedUrl = await PageObjects.share.getSharedUrl();
      await PageObjects.share.clickShareTopNavButton();
      return sharedUrl;
    };

    const hardRefresh = async (newUrl: string) => {
      // We add a timestamp here to force a hard refresh
      await browser.get(newUrl.toString());
      const alert = await browser.getAlert();
      await alert?.accept();
      await enableNewChartLibraryDebug(true);
      await PageObjects.dashboard.waitForRenderComplete();
    };

    describe('Directly modifying url updates dashboard state', () => {
      before(async () => {
        await PageObjects.dashboard.gotoDashboardLandingPage();
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.timePicker.setHistoricalDataRange();
      });

      const changeQuery = async (useHardRefresh: boolean, newQuery: string) => {
        await queryBar.clickQuerySubmitButton();
        const oldQuery = await queryBar.getQueryString();
        const currentUrl = await getUrlFromShare();
        const newUrl = currentUrl.replace(`query:'${oldQuery}'`, `query:'${newQuery}'`);

        await browser.get(newUrl.toString(), !useHardRefresh);
        const queryBarContentsAfterRefresh = await queryBar.getQueryString();
        expect(queryBarContentsAfterRefresh).to.equal(newQuery);
      };

      it('for query parameter with soft refresh', async function () {
        await changeQuery(false, 'hi:goodbye');
        await PageObjects.dashboard.expectAppStateRemovedFromURL();
      });

      it('for query parameter with hard refresh', async function () {
        await changeQuery(true, 'hi:hello');
        await queryBar.clearQuery();
        await queryBar.clickQuerySubmitButton();
        await PageObjects.dashboard.expectAppStateRemovedFromURL();
      });

      it('for panel size parameters', async function () {
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        const currentUrl = await getUrlFromShare();
        const currentPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
        const newUrl = currentUrl.replace(
          `w:${DEFAULT_PANEL_WIDTH}`,
          `w:${DEFAULT_PANEL_WIDTH * 2}`
        );
        await hardRefresh(newUrl);

        await retry.try(async () => {
          const newPanelDimensions = await PageObjects.dashboard.getPanelDimensions();
          if (newPanelDimensions.length < 0) {
            throw new Error('No panel dimensions...');
          }

          await PageObjects.dashboard.waitForRenderComplete();
          // Add a "margin" of error  - because of page margins, it won't be a straight doubling of width.
          const marginOfError = 10;
          expect(newPanelDimensions[0].width).to.be.lessThan(
            currentPanelDimensions[0].width * 2 + marginOfError
          );
          expect(newPanelDimensions[0].width).to.be.greaterThan(
            currentPanelDimensions[0].width * 2 - marginOfError
          );
        });
      });

      it('when removing a panel', async function () {
        await PageObjects.dashboard.waitForRenderComplete();
        const currentUrl = await getUrlFromShare();
        const newUrl = currentUrl.replace(/panels:\!\(.*\),query/, 'panels:!(),query');
        await hardRefresh(newUrl);

        await retry.try(async () => {
          const newPanelCount = await PageObjects.dashboard.getPanelCount();
          expect(newPanelCount).to.be(0);
        });
      });

      describe('for embeddable config color parameters on a visualization', () => {
        let originalPieSliceStyle = '';

        before(async () => {
          await queryBar.clearQuery();
          await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
          await enableNewChartLibraryDebug();
          originalPieSliceStyle = await pieChart.getPieSliceStyle(`80,000`);
        });

        it('updates a pie slice color on a hard refresh', async function () {
          await PageObjects.visChart.openLegendOptionColorsForPie(
            '80,000',
            `[data-title="${PIE_CHART_VIS_NAME}"]`
          );
          await PageObjects.visChart.selectNewLegendColorChoice('#F9D9F9');
          const currentUrl = await getUrlFromShare();
          const newUrl = currentUrl.replace('F9D9F9', 'FFFFFF');
          await hardRefresh(newUrl);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const allPieSlicesColor = await pieChart.getAllPieSliceColor('80,000');
            const whitePieSliceCounts = allPieSlicesColor.reduce((count, color) => {
              // converting the color to a common format, testing the color, not the string format
              return chroma(color).hex().toUpperCase() === '#FFFFFF' ? count + 1 : count;
            }, 0);
            expect(whitePieSliceCounts).to.be(1);
          });
        });

        it('and updates the pie slice legend color', async function () {
          await retry.try(async () => {
            const colorExists = await PageObjects.visChart.doesSelectedLegendColorExistForPie(
              '#FFFFFF'
            );
            expect(colorExists).to.be(true);
          });
        });

        it('resets a pie slice color to the original when removed', async function () {
          const currentUrl = await getUrlFromShare();
          const newUrl = isNewChartsLibraryEnabled
            ? currentUrl.replace(`'80000':%23FFFFFF`, '')
            : currentUrl.replace(`vis:(colors:('80,000':%23FFFFFF))`, '');

          await hardRefresh(newUrl);
          await PageObjects.header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const pieSliceStyle = await pieChart.getPieSliceStyle('80,000');

            // After removing all overrides, pie slice style should match original.
            expect(pieSliceStyle).to.be(originalPieSliceStyle);
          });
        });

        it('resets the legend color as well', async function () {
          await retry.try(async () => {
            const colorExists = await PageObjects.visChart.doesSelectedLegendColorExistForPie(
              '#57c17b'
            );
            expect(colorExists).to.be(true);
          });
        });
      });
    });
  });
}
