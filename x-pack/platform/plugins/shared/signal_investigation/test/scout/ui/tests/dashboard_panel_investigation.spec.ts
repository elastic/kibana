/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW,
  generateLogRateAnalysisSpikeData,
} from '@kbn/synthtrace';
import { v4 as uuidv4 } from 'uuid';
import { test } from '../fixtures';

const LAYER_ID = 'log-count-layer';
const PANEL_INDEX = 'log-count-panel';
const TIMESTAMP_COLUMN = 'timestamp';
const COUNT_COLUMN = 'count';

/** A by-value count-over-time Lens panel whose data view reference uses the test data view. */
const buildLogCountPanel = (panelTitle: string, dataViewId: string) => ({
  type: 'lens',
  title: panelTitle,
  panelIndex: PANEL_INDEX,
  gridData: { x: 0, y: 0, w: 24, h: 15, i: PANEL_INDEX },
  embeddableConfig: {
    title: panelTitle,
    syncColors: false,
    syncCursor: true,
    syncTooltips: false,
    filters: [],
    query: { query: '', language: 'kuery' },
    attributes: {
      title: panelTitle,
      type: 'lens',
      visualizationType: 'lnsXY',
      references: [
        {
          id: dataViewId,
          name: `indexpattern-datasource-layer-${LAYER_ID}`,
          type: 'index-pattern',
        },
      ],
      state: {
        visualization: {
          preferredSeriesType: 'line',
          legend: { isVisible: false, position: 'right' },
          layers: [
            {
              layerId: LAYER_ID,
              accessors: [COUNT_COLUMN],
              layerType: 'data',
              seriesType: 'line',
              xAccessor: TIMESTAMP_COLUMN,
              yConfig: [{ axisMode: 'left', forAccessor: COUNT_COLUMN }],
            },
          ],
        },
        query: { query: '', language: 'kuery' },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              [LAYER_ID]: {
                columnOrder: [TIMESTAMP_COLUMN, COUNT_COLUMN],
                incompleteColumns: {},
                sampling: 1,
                columns: {
                  [TIMESTAMP_COLUMN]: {
                    label: '@timestamp',
                    dataType: 'date',
                    operationType: 'date_histogram',
                    sourceField: '@timestamp',
                    isBucketed: true,
                    params: {
                      interval: 'auto',
                      includeEmptyRows: false,
                      dropPartials: false,
                    },
                  },
                  [COUNT_COLUMN]: {
                    label: 'Count of records',
                    dataType: 'number',
                    operationType: 'count',
                    sourceField: '___records___',
                    isBucketed: false,
                    params: { emptyAsNull: true },
                  },
                },
              },
            },
          },
          textBased: { layers: {} },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    },
  },
});

const createLogCountDashboard = async (
  kbnClient: KbnClient,
  { title, panelTitle, dataViewId }: { title: string; panelTitle: string; dataViewId: string }
): Promise<string> => {
  const dashboard = await kbnClient.savedObjects.create({
    type: 'dashboard',
    overwrite: false,
    attributes: {
      title,
      description: '',
      panelsJSON: JSON.stringify([buildLogCountPanel(panelTitle, dataViewId)]),
      optionsJSON:
        '{"useMargins":true,"syncColors":false,"syncCursor":true,"syncTooltips":false,"hidePanelTitles":false}',
      timeRestore: true,
      timeFrom: LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.start,
      timeTo: LOG_RATE_ANALYSIS_SPIKE_DEVIATION_WINDOW.end,
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
      },
    },
    references: [
      {
        id: dataViewId,
        name: `${PANEL_INDEX}:indexpattern-datasource-layer-${LAYER_ID}`,
        type: 'index-pattern',
      },
    ],
  });

  return dashboard.id;
};

test.describe(
  'Signal investigation from a Dashboard Lens panel',
  { tag: tags.stateful.classic },
  () => {
    const runId = uuidv4();
    const dataViewId = `signal-inv-dash-dv-${runId}`;
    const dashboardTitle = `Signal investigation dashboard ${runId}`;
    const panelTitle = `Log count ${runId}`;
    let dashboardId = '';

    test.beforeAll(async ({ apiServices, kbnClient, logsSynthtraceEsClient }) => {
      const { generator } = generateLogRateAnalysisSpikeData({
        logsEsClient: logsSynthtraceEsClient as never,
      });
      await logsSynthtraceEsClient.index(generator);

      await apiServices.dataViews.create({
        id: dataViewId,
        title: 'logs-payments.api-*',
        name: `Payments logs ${runId}`,
        timeFieldName: '@timestamp',
        override: true,
      });

      dashboardId = await createLogCountDashboard(kbnClient, {
        title: dashboardTitle,
        panelTitle,
        dataViewId,
      });
    });

    test.afterAll(async ({ apiServices, kbnClient, logsSynthtraceEsClient }) => {
      await kbnClient.savedObjects
        .delete({
          type: 'dashboard',
          id: dashboardId,
        })
        .catch(() => {});
      await apiServices.dataViews.delete(dataViewId).catch(() => {});
      await logsSynthtraceEsClient.clean();
    });

    test('opens Find related changes from a Lens panel menu on a dashboard', async ({
      browserAuth,
      pageObjects,
    }) => {
      const { dashboard, signalInvestigationFlyout } = pageObjects;

      await test.step('open Find related changes from the panel menu', async () => {
        await browserAuth.loginAsPrivilegedUser();
        await dashboard.openDashboardWithId(dashboardId);
        await dashboard.clickPanelAction(
          'embeddablePanelAction-signal-investigation-panel-action',
          panelTitle
        );
        await expect(signalInvestigationFlyout.flyout).toBeVisible();
        await expect(signalInvestigationFlyout.flyout).toContainText(panelTitle);
      });
    });
  }
);
