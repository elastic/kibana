/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import chroma from 'chroma-js';
import rison from '@kbn/rison';
import type { SharedDashboardState } from '@kbn/dashboard-plugin/common';
import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'dashboard',
    'visualize',
    'header',
    'discover',
    'visChart',
    'share',
    'timePicker',
    'unifiedFieldList',
  ]);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const retry = getService('retry');
  const elasticChart = getService('elasticChart');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const xyChartSelector = 'xyVisChart';
  const log = getService('log');

  const updateAppStateQueryParam = (
    url: string,
    setAppState: (appState: Partial<SharedDashboardState>) => Partial<SharedDashboardState>
  ) => {
    log.debug(`updateAppStateQueryParam, before url: ${url}`);

    // Using lastIndexOf because URL may have 2 sets of query parameters.
    // 1) server query parameters, '_t'
    // 2) client query parameters, '_g' and '_a'. Anything after the '#' in a URL is used by the client
    // Example shape of URL http://localhost:5620/app/dashboards?_t=12345#/create?_g=()
    const clientQueryParamsStartIndex = url.lastIndexOf('?');
    if (clientQueryParamsStartIndex === -1) {
      throw Error(`Unable to locate query parameters in URL: ${url}`);
    }
    const urlBeforeClientQueryParams = url.substring(0, clientQueryParamsStartIndex);
    const urlParams = new URLSearchParams(url.substring(clientQueryParamsStartIndex + 1));
    const appState: Partial<SharedDashboardState> = urlParams.has('_a')
      ? (rison.decode(urlParams.get('_a')!) as Partial<SharedDashboardState>)
      : {};
    const newAppState = {
      ...appState,
      ...setAppState(appState),
    };
    urlParams.set('_a', rison.encode(newAppState));
    const newUrl = urlBeforeClientQueryParams + '?' + urlParams.toString();
    log.debug(`updateAppStateQueryParam, after url: ${newUrl}`);
    return newUrl;
  };

  const enableNewChartLibraryDebug = async (force = false) => {
    if ((await PageObjects.visChart.isNewChartsLibraryEnabled()) || force) {
      await elasticChart.setNewChartUiDebugFlag();
      await queryBar.submitQuery();
    }
  };

  describe('dashboard state', function () {
    before(async function () {
      await PageObjects.dashboard.initTests();
      await PageObjects.dashboard.preserveCrossAppState();

      await browser.refresh();
    });

    after(async function () {
      await PageObjects.dashboard.gotoDashboardLandingPage();
    });

    afterEach(async () => {
      retry.waitFor('close share modal', async () => {
        if (await testSubjects.exists('shareContextModal')) {
          await PageObjects.share.closeShareModal(); // close modal
        }
        return await testSubjects.exists('shareTopNavButton');
      });
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
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('bytes');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await PageObjects.dashboard.saveDashboard('No local edits');

      const inViewMode = await testSubjects.exists('dashboardEditMode');
      expect(inViewMode).to.be(true);

      await PageObjects.header.clickDiscover();
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('agent');
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
      await PageObjects.unifiedFieldList.clickFieldListItemAdd('clientip');
      await PageObjects.discover.saveSearch('my search');
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.header.clickDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();

      const headers = await PageObjects.discover.getColumnHeaders();
      expect(headers.length).to.be(2);
      expect(headers[1]).to.be('agent');
    });

    // generates only a short url
    const getUrlFromShare = async () => {
      log.debug(`getUrlFromShare`);
      await PageObjects.share.clickShareTopNavButton();
      const sharedUrl = await PageObjects.share.getSharedUrl();
      await PageObjects.share.closeShareModal();
      log.debug(`sharedUrl: ${sharedUrl}`);
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

    describe('for embeddable config color parameters on a visualization', () => {
      let originalPieSliceStyle = '';

      before(async () => {
        await queryBar.clearQuery();
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        await enableNewChartLibraryDebug();
        originalPieSliceStyle = (await pieChart.getPieSliceStyle(`80,000`)) ?? '';
      });

      it('updates a pie slice color on a hard refresh', async function () {
        await PageObjects.visChart.openLegendOptionColorsForPie(
          '80,000',
          `[data-title="${PIE_CHART_VIS_NAME}"]`
        );
        await PageObjects.visChart.selectNewLegendColorChoice('#F9D9F9');
        const currentUrl = await getUrlFromShare();
        await PageObjects.share.closeShareModal();
        const newUrl = updateAppStateQueryParam(
          currentUrl,
          (appState: Partial<SharedDashboardState>) => {
            return {
              panels: (appState.panels ?? []).map((panel) => {
                return {
                  ...panel,
                  embeddableConfig: {
                    ...(panel.embeddableConfig ?? {}),
                    vis: {
                      ...((panel.embeddableConfig?.vis as object) ?? {}),
                      colors: {
                        ...((panel.embeddableConfig?.vis as { colors: object })?.colors ?? {}),
                        ['80000']: 'FFFFFF',
                      },
                    },
                  },
                };
              }),
            };
          }
        );
        await PageObjects.share.closeShareModal();
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
        const newUrl = updateAppStateQueryParam(
          currentUrl,
          (appState: Partial<SharedDashboardState>) => {
            return {
              panels: (appState.panels ?? []).map((panel) => {
                return {
                  ...panel,
                  embeddableConfig: {
                    ...(panel.embeddableConfig ?? {}),
                    vis: {
                      ...((panel.embeddableConfig?.vis as object) ?? {}),
                      colors: {},
                    },
                  },
                };
              }),
            };
          }
        );

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
}
