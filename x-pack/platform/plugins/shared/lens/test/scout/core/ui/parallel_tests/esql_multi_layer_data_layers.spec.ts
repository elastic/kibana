/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  addDataLayer,
  applyLensInlineEditorAndWaitClosed,
  cancelLensInlineEditorAndWaitClosed,
  cleanupEsqlMultiLayerEnvironment,
  configureEsqlMultiLayerEnvironment,
  expectEsqlChartToRender,
  loadFreshEsqlMultiLayerDashboard,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const COUNT_QUERY =
  'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS COUNT(*) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
const MAX_QUERY =
  'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS MAX(bytes) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend) | LIMIT 100';
const X_DIMENSION = 'lnsXY_xDimensionPanel';
const Y_DIMENSION = 'lnsXY_yDimensionPanel';

spaceTest.describe('Lens ES|QL data-layer lifecycle', { tag: '@local-stateful-classic' }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await configureEsqlMultiLayerEnvironment(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
    const importedDashboardId = await loadFreshEsqlMultiLayerDashboard({
      scoutSpace,
      browserAuth,
      dashboard: pageObjects.dashboard,
    });
    dashboardId = importedDashboardId;
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupEsqlMultiLayerEnvironment(scoutSpace);
  });

  spaceTest('creates and edits independent ES|QL data layers', async ({ page, pageObjects }) => {
    const { dashboard, lens } = pageObjects;

    await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
    expect(await lens.layers.getLayerCount()).toBe(1);
    expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);

    await addDataLayer(page);
    expect(await lens.layers.getLayerCount()).toBe(2);
    expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);

    await lens.workspace.submitEsqlQuery(MAX_QUERY);
    await dashboard.waitForRenderComplete();
    await lens.dimensions.setTextBasedDimensionField(X_DIMENSION, '@timestamp', 1);
    await lens.dimensions.setTextBasedDimensionField(Y_DIMENSION, 'MAX(bytes)', 1);
    await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

    const panel = dashboard.getPanelByEmbeddableId(testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
    await expect(panel.getByRole('button', { name: /Count of records/ })).toBeVisible();
    await expect(panel.getByRole('button', { name: /MAX\(bytes\)/ })).toBeVisible();

    await lens.layers.activateLayerTab(0);
    expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
    await lens.layers.activateLayerTab(1);
    expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);

    await applyLensInlineEditorAndWaitClosed({ lens });
    await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
    expect(await lens.layers.getLayerCount()).toBe(2);
    await lens.layers.activateLayerTab(1);
    expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);
  });

  spaceTest(
    'duplicates and deletes ES|QL layers via the tab actions',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await addDataLayer(page);
      await lens.workspace.submitEsqlQuery(MAX_QUERY);
      await dashboard.waitForRenderComplete();
      await lens.dimensions.setTextBasedDimensionField(X_DIMENSION, '@timestamp', 1);
      await lens.dimensions.setTextBasedDimensionField(Y_DIMENSION, 'MAX(bytes)', 1);
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      // Duplicate the second (MAX) layer: the clone carries the layer query and dimensions.
      await lens.layers.duplicateLayer(1);
      expect(await lens.layers.getLayerCount()).toBe(3);
      await lens.layers.ensureLayerTabIsActive(2);
      expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);
      // clone keeps the Y dimension; duplicated columns may get a dedupe label suffix (e.g. "MAX(bytes) [3]")
      await expect(lens.dimensions.getDimensionTriggersLocator(Y_DIMENSION)).toHaveText(
        /^MAX\(bytes\)/
      );
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      // The clone is independent: changing its query (dimensions rebind via column
      // reconciliation) leaves the original layer untouched.
      await lens.workspace.submitEsqlQuery(COUNT_QUERY);
      await expect(lens.dimensions.getDimensionTriggersLocator(Y_DIMENSION)).toHaveText(
        /^COUNT\(\*\)/
      );
      await lens.layers.activateLayerTab(1);
      expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);

      // Delete the cloned layer via the tab actions.
      await lens.layers.removeLayer(2);
      expect(await lens.layers.getLayerCount()).toBe(2);
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      // The surviving layers keep their queries after apply + reopen.
      await applyLensInlineEditorAndWaitClosed({ lens });
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      expect(await lens.layers.getLayerCount()).toBe(2);
      await lens.layers.activateLayerTab(1);
      expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );

  spaceTest(
    'keeps the new source time field after changing a secondary layer query',
    async ({ kbnClient, page, pageObjects, scoutSpace }) => {
      const indexName = 'logstash-2015.09.22';
      const { dashboard, lens } = pageObjects;
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await addDataLayer(page);

      const newSourceQuery =
        `FROM ${indexName} ` +
        '| WHERE utc_time >= ?_tstart AND utc_time <= ?_tend ' +
        '| STATS COUNT(*) BY utc_time = BUCKET(utc_time, 75, ?_tstart, ?_tend)';
      await lens.workspace.submitEsqlQuery(newSourceQuery);
      await lens.dimensions.setTextBasedDimensionField(X_DIMENSION, 'utc_time', 1);
      await lens.dimensions.setTextBasedDimensionField(Y_DIMENSION, 'COUNT(*)', 1);
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      await applyLensInlineEditorAndWaitClosed({ lens });
      await dashboard.saveChangesToExistingDashboard();

      interface PersistedLayer {
        index?: string;
        timeField?: string;
        query?: { esql: string };
      }
      interface PersistedTextBasedState {
        layers: Record<string, PersistedLayer>;
        indexPatternRefs?: Array<{ id: string; title: string; timeField?: string }>;
      }
      const getPersistedTextBasedState = async (): Promise<PersistedTextBasedState> => {
        const { attributes } = await kbnClient.savedObjects.get<{ panelsJSON: string }>({
          type: 'dashboard',
          id: dashboardId,
          space: scoutSpace.id,
        });
        const panels = JSON.parse(attributes.panelsJSON) as Array<{
          panelIndex: string;
          embeddableConfig: {
            attributes: {
              state: {
                datasourceStates: { textBased: PersistedTextBasedState };
              };
            };
          };
        }>;
        const panel = panels.find(
          ({ panelIndex }) => panelIndex === testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA
        );
        return (
          panel?.embeddableConfig.attributes.state.datasourceStates.textBased ?? { layers: {} }
        );
      };

      await expect
        .poll(async () => Object.keys((await getPersistedTextBasedState()).layers).length)
        .toBe(2);
      const textBasedState = await getPersistedTextBasedState();
      const editedLayer = Object.values(textBasedState.layers).find(
        ({ query }) => query?.esql === newSourceQuery
      );
      const editedLayerIndexRef = textBasedState.indexPatternRefs?.find(
        ({ title }) => title === indexName
      );
      expect(editedLayerIndexRef).toMatchObject({ timeField: 'utc_time' });
      expect(editedLayer).toMatchObject({
        index: editedLayerIndexRef?.id,
        timeField: 'utc_time',
      });
    }
  );
});
