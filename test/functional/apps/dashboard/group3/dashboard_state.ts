/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import chroma from 'chroma-js';
import rison from '@kbn/rison';
import { DEFAULT_PANEL_WIDTH } from '@kbn/dashboard-plugin/common/content_management/constants';
import type { SharedDashboardState } from '@kbn/dashboard-plugin/public/dashboard_app/url/url_utils';
import { PIE_CHART_VIS_NAME, AREA_CHART_VIS_NAME } from '../../../page_objects/dashboard_page';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { dashboard, header, discover, visChart, share, timePicker, unifiedFieldList } =
    getPageObjects([
      'dashboard',
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
    if ((await visChart.isNewChartsLibraryEnabled()) || force) {
      await elasticChart.setNewChartUiDebugFlag();
      await queryBar.submitQuery();
    }
  };

  describe('dashboard state', function () {
    before(async function () {
      await dashboard.initTests();
      await dashboard.preserveCrossAppState();

      await browser.refresh();
    });

    after(async function () {
      await dashboard.gotoDashboardLandingPage();
    });

    it('Overriding colors on an area chart is preserved', async () => {
      await dashboard.gotoDashboardLandingPage();

      await dashboard.clickNewDashboard();
      await timePicker.setHistoricalDataRange();

      const visName = AREA_CHART_VIS_NAME;
      await dashboardAddPanel.addVisualization(visName);
      const dashboardName = 'Overridden colors - new charts library';
      await dashboard.saveDashboard(dashboardName);

      await dashboard.switchToEditMode();
      await queryBar.clickQuerySubmitButton();

      await visChart.openLegendOptionColorsForXY('Count', `[data-title="${visName}"]`);
      const overwriteColor = '#64d8d5';
      await visChart.selectNewLegendColorChoice(overwriteColor);

      await dashboard.saveDashboard(dashboardName, { saveAsNew: false });

      await dashboard.gotoDashboardLandingPage();
      await dashboard.loadSavedDashboard(dashboardName);

      await enableNewChartLibraryDebug(true);

      const colorChoiceRetained = await visChart.doesSelectedLegendColorExistForXY(
        overwriteColor,
        xyChartSelector
      );

      expect(colorChoiceRetained).to.be(true);
    });

    it('Saved search with no changes will update when the saved object changes', async () => {
      await dashboard.gotoDashboardLandingPage();

      await header.clickDiscover();
      await timePicker.setHistoricalDataRange();
      await unifiedFieldList.clickFieldListItemAdd('bytes');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await dashboard.clickNewDashboard();

      await dashboardAddPanel.addSavedSearch('my search');
      await dashboard.saveDashboard('No local edits');

      const inViewMode = await testSubjects.exists('dashboardEditMode');
      expect(inViewMode).to.be(true);

      await header.clickDiscover();
      await unifiedFieldList.clickFieldListItemAdd('agent');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      const headers = await discover.getColumnHeaders();
      expect(headers.length).to.be(3);
      expect(headers[1]).to.be('bytes');
      expect(headers[2]).to.be('agent');
    });

    it('Saved search with column changes will not update when the saved object changes', async () => {
      await dashboard.switchToEditMode();
      await discover.removeHeaderColumn('bytes');
      await dashboard.saveDashboard('Has local edits');

      await header.clickDiscover();
      await unifiedFieldList.clickFieldListItemAdd('clientip');
      await discover.saveSearch('my search');
      await header.waitUntilLoadingHasFinished();

      await header.clickDashboard();
      await header.waitUntilLoadingHasFinished();

      const headers = await discover.getColumnHeaders();
      expect(headers.length).to.be(2);
      expect(headers[1]).to.be('agent');
    });

    const getUrlFromShare = async () => {
      log.debug(`getUrlFromShare`);
      await share.clickShareTopNavButton();
      const sharedUrl = await share.getSharedUrl();
      await share.closeShareModal();
      log.debug(`sharedUrl: ${sharedUrl}`);
      return sharedUrl;
    };

    const hardRefresh = async (newUrl: string) => {
      // We add a timestamp here to force a hard refresh
      await browser.get(newUrl.toString());
      const alert = await browser.getAlert();
      await alert?.accept();
      await enableNewChartLibraryDebug(true);
      await dashboard.waitForRenderComplete();
    };

    // Skip this test; directly modifying the URL app state isn't fully supported in the new
    // React embeddable framework, but this user interaction is not a high priority
    describe.skip('Directly modifying url updates dashboard state', () => {
      before(async () => {
        await dashboard.gotoDashboardLandingPage();
        await dashboard.clickNewDashboard();
        await timePicker.setHistoricalDataRange();
      });

      const changeQuery = async (useHardRefresh: boolean, newQuery: string) => {
        await queryBar.clickQuerySubmitButton();
        const currentUrl = await getUrlFromShare();
        const newUrl = updateAppStateQueryParam(
          currentUrl,
          (appState: Partial<SharedDashboardState>) => {
            return {
              query: {
                language: 'kuery',
                query: newQuery,
              },
            };
          }
        );

        await browser.get(newUrl.toString(), !useHardRefresh);
        await dashboard.waitForRenderComplete();
        const queryBarContentsAfterRefresh = await queryBar.getQueryString();
        expect(queryBarContentsAfterRefresh).to.equal(newQuery);
      };

      it('for query parameter with hard refresh', async function () {
        await changeQuery(true, 'hi:hello');
        await queryBar.clearQuery();
        await queryBar.clickQuerySubmitButton();
        await dashboard.expectAppStateRemovedFromURL();
      });

      it('for panel size parameters', async function () {
        await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
        const currentUrl = await getUrlFromShare();
        const currentPanelDimensions = await dashboard.getPanelDimensions();
        const newUrl = updateAppStateQueryParam(
          currentUrl,
          (appState: Partial<SharedDashboardState>) => {
            log.debug(JSON.stringify(appState, null, ' '));
            return {
              panels: (appState.panels ?? []).map((panel) => {
                return {
                  ...panel,
                  gridData: {
                    ...panel.gridData,
                    w:
                      panel.gridData.w === DEFAULT_PANEL_WIDTH
                        ? DEFAULT_PANEL_WIDTH * 2
                        : panel.gridData.w,
                  },
                };
              }),
            };
          }
        );
        await hardRefresh(newUrl);

        await retry.try(async () => {
          const newPanelDimensions = await dashboard.getPanelDimensions();
          if (newPanelDimensions.length < 0) {
            throw new Error('No panel dimensions...');
          }

          await dashboard.waitForRenderComplete();
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
        await dashboard.waitForRenderComplete();
        const currentUrl = (await getUrlFromShare()) ?? '';
        const newUrl = updateAppStateQueryParam(
          currentUrl,
          (appState: Partial<SharedDashboardState>) => {
            return {
              panels: [],
            };
          }
        );
        await hardRefresh(newUrl);

        await retry.try(async () => {
          const newPanelCount = await dashboard.getPanelCount();
          expect(newPanelCount).to.be(0);
        });
      });

      describe('for embeddable config color parameters on a visualization', () => {
        let originalPieSliceStyle = '';

        before(async () => {
          await queryBar.clearQuery();
          await dashboardAddPanel.addVisualization(PIE_CHART_VIS_NAME);
          await enableNewChartLibraryDebug();
          originalPieSliceStyle = (await pieChart.getPieSliceStyle(`80,000`)) ?? '';
        });

        it('updates a pie slice color on a hard refresh', async function () {
          await visChart.openLegendOptionColorsForPie(
            '80,000',
            `[data-title="${PIE_CHART_VIS_NAME}"]`
          );
          await visChart.selectNewLegendColorChoice('#F9D9F9');
          const currentUrl = await getUrlFromShare();
          const newUrl = updateAppStateQueryParam(
            currentUrl,
            (appState: Partial<SharedDashboardState>) => {
              return {
                panels: (appState.panels ?? []).map((panel) => {
                  return {
                    ...panel,
                    panelConfig: {
                      ...(panel.panelConfig ?? {}),
                      vis: {
                        ...((panel.panelConfig?.vis as object) ?? {}),
                        colors: {
                          ...((panel.panelConfig?.vis as { colors: object })?.colors ?? {}),
                          ['80000']: 'FFFFFF',
                        },
                      },
                    },
                  };
                }),
              };
            }
          );
          await hardRefresh(newUrl);
          await header.waitUntilLoadingHasFinished();

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
            const colorExists = await visChart.doesSelectedLegendColorExistForPie('#FFFFFF');
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
                    panelConfig: {
                      ...(panel.panelConfig ?? {}),
                      vis: {
                        ...((panel.panelConfig?.vis as object) ?? {}),
                        colors: {},
                      },
                    },
                  };
                }),
              };
            }
          );

          await hardRefresh(newUrl);
          await header.waitUntilLoadingHasFinished();

          await retry.try(async () => {
            const pieSliceStyle = await pieChart.getPieSliceStyle('80,000');

            // After removing all overrides, pie slice style should match original.
            expect(pieSliceStyle).to.be(originalPieSliceStyle);
          });
        });

        it('resets the legend color as well', async function () {
          await retry.try(async () => {
            const colorExists = await visChart.doesSelectedLegendColorExistForPie('#57c17b');
            expect(colorExists).to.be(true);
          });
        });
      });
    });
  });
}
