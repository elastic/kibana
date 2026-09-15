/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { getImportedDashboardId, getImportedSavedObjectId, spaceTest, testData } from '../fixtures';

const RELATED_PANEL_ID = testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA;
const UNRELATED_PANEL_ID = testData.ESQL_MULTI_LAYER_PANEL_IDS.MIXED_DATA;
const CONTROL_LABEL = 'os';
const VARIABLE_LAYER_ID = 'os_layer';
const VARIABLE_QUERY =
  'FROM logstash-* | WHERE machine.os.raw == ?os | STATS MAX(bytes) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

/**
 * Reuses the multi-layer fixture dashboard and patches the imported saved object:
 * - adds an ES|QL variable control (`?os`, values from query, `ios` selected)
 * - adds a *second* ES|QL layer using `?os` to the DATA panel, so highlighting
 *   must consider non-first layer queries
 */
const addVariableControlAndLayer = async (
  kbnClient: KbnClient,
  space: string,
  dashboardId: string
) => {
  const { attributes, references } = await kbnClient.savedObjects.get<Record<string, unknown>>({
    type: 'dashboard',
    id: dashboardId,
    space,
  });

  const panels = JSON.parse(attributes.panelsJSON as string);
  const dataPanel = panels.find(
    (panel: { panelIndex: string }) => panel.panelIndex === RELATED_PANEL_ID
  );
  const { state } = dataPanel.embeddableConfig.attributes;
  state.datasourceStates.textBased.layers[VARIABLE_LAYER_ID] = {
    index: 'logstash-*',
    query: { esql: VARIABLE_QUERY },
    timeField: '@timestamp',
    columns: [
      {
        columnId: `${VARIABLE_LAYER_ID}_x`,
        fieldName: '@timestamp',
        label: 'timestamp',
        customLabel: true,
        meta: { type: 'date' },
      },
      {
        columnId: `${VARIABLE_LAYER_ID}_y`,
        fieldName: 'MAX(bytes)',
        label: 'Max of bytes',
        customLabel: true,
        meta: { type: 'number' },
      },
    ],
    ignoreGlobalFilters: false,
  };
  state.visualization.layers.push({
    layerId: VARIABLE_LAYER_ID,
    accessors: [`${VARIABLE_LAYER_ID}_y`],
    layerType: 'data',
    seriesType: 'line',
    xAccessor: `${VARIABLE_LAYER_ID}_x`,
  });

  await kbnClient.savedObjects.update({
    type: 'dashboard',
    id: dashboardId,
    space,
    references,
    attributes: {
      ...attributes,
      panelsJSON: JSON.stringify(panels),
      pinned_panels: {
        panels: {
          'esql-os-control': {
            type: 'esql_control',
            order: 0,
            grow: false,
            width: 'medium',
            config: {
              control_type: 'VALUES_FROM_QUERY',
              esql_query: 'FROM logstash-* | STATS BY machine.os.raw',
              selected_options: ['ios'],
              single_select: true,
              title: CONTROL_LABEL,
              variable_name: CONTROL_LABEL,
              variable_type: 'values',
            },
          },
        },
      },
    },
  });
};

spaceTest.describe(
  'Lens ES|QL variable control panel highlighting',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      const savedObjects = await scoutSpace.savedObjects.load(
        testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
      );
      const dataViewId = getImportedSavedObjectId(savedObjects, 'index-pattern', 'logstash-*');

      await scoutSpace.uiSettings.set({
        defaultIndex: dataViewId,
        'dateFormat:tz': 'UTC',
        'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth, kbnClient, pageObjects, scoutSpace }) => {
      const savedObjects = await scoutSpace.savedObjects.load(
        testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
      );
      const dashboardId = getImportedDashboardId(savedObjects, 'ESQL Multi-layer Dashboard');
      await addVariableControlAndLayer(kbnClient, scoutSpace.id, dashboardId);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.dashboard.openDashboardWithIdInEditMode(dashboardId);
      await pageObjects.dashboard.waitForPanelsToLoad(2);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'highlights the panel that uses the variable in a non-first ES|QL layer',
      async ({ page, pageObjects }) => {
        const { dashboard } = pageObjects;
        await dashboard.waitForRenderComplete();

        // the variable is only used by the *second* ES|QL layer of the related
        // panel, so a clickable label (role=button) proves per-layer queries are
        // published via `esql$` (https://github.com/elastic/kibana/issues/290100)
        const controlFrame = page.testSubj.locator('control-frame');
        // exact match: the drag handle is also a button named "Move control os"
        const controlLabel = controlFrame.getByRole('button', {
          name: CONTROL_LABEL,
          exact: true,
        });
        await expect(controlLabel).toBeVisible();
        await expect(
          controlFrame.getByLabel('Warning: No related panels', { exact: true })
        ).toHaveCount(0);

        await controlLabel.click();

        // dashboard blurs unrelated panels while highlighting is active; grid
        // items expose no test subject for the blurred state, so assert the class
        const relatedGridItem = page.locator(`#panel-${RELATED_PANEL_ID}`);
        const unrelatedGridItem = page.locator(`#panel-${UNRELATED_PANEL_ID}`);
        await expect(unrelatedGridItem).toHaveClass(/dshDashboardGrid__item--blurred/);
        await expect(relatedGridItem).not.toHaveClass(/dshDashboardGrid__item--blurred/);

        // unselecting the label stops highlighting
        await controlLabel.click();
        await expect(unrelatedGridItem).not.toHaveClass(/dshDashboardGrid__item--blurred/);
      }
    );
  }
);
