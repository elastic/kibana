/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  applyLensInlineEditorAndWaitClosed,
  getImportedDashboardId,
  getImportedSavedObjectId,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const RELATED_PANEL_ID = testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA;
const UNRELATED_PANEL_ID = testData.ESQL_MULTI_LAYER_PANEL_IDS.MIXED_DATA;
const CONTROL_LABEL = 'os';
const FIELD_CONTROL_LABEL = 'metric_field';
const VARIABLE_LAYER_ID = 'variable_layer';
const VALUE_VARIABLE_QUERY =
  'FROM logstash-* | WHERE machine.os.raw == ?os | STATS MAX(bytes) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
const FIELD_VARIABLE_QUERY =
  'FROM logstash-* | STATS AVG(??metric_field) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

/**
 * Reuses the multi-layer fixture dashboard and patches the imported saved object:
 * - adds an ES|QL variable control (`?os`, values from query, `ios` selected)
 * - adds a *second* ES|QL layer using `?os` to the DATA panel, so highlighting
 *   must consider non-first layer queries
 */
const addVariableControlAndLayer = async (
  kbnClient: KbnClient,
  space: string,
  dashboardId: string,
  controlType: 'values' | 'fields'
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
    query: {
      esql:
        controlType === 'values'
          ? VALUE_VARIABLE_QUERY
          : 'FROM logstash-* | STATS MAX(bytes) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)',
    },
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
          'esql-variable-control': {
            type: 'esql_control',
            order: 0,
            grow: false,
            width: 'medium',
            config:
              controlType === 'values'
                ? {
                    control_type: 'VALUES_FROM_QUERY',
                    esql_query: 'FROM logstash-* | STATS BY machine.os.raw',
                    selected_options: ['ios'],
                    single_select: true,
                    title: CONTROL_LABEL,
                    variable_name: CONTROL_LABEL,
                    variable_type: 'values',
                  }
                : {
                    control_type: 'STATIC_VALUES',
                    available_options: ['bytes', 'memory'],
                    selected_options: ['bytes'],
                    single_select: true,
                    title: FIELD_CONTROL_LABEL,
                    variable_name: FIELD_CONTROL_LABEL,
                    variable_type: 'fields',
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

    spaceTest.beforeEach(async ({ browserAuth, kbnClient, pageObjects, scoutSpace }, testInfo) => {
      const savedObjects = await scoutSpace.savedObjects.load(
        testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
      );
      const dashboardId = getImportedDashboardId(savedObjects, 'ESQL Multi-layer Dashboard');
      const controlType = testInfo.title.includes('identifier variable') ? 'fields' : 'values';
      await addVariableControlAndLayer(kbnClient, scoutSpace.id, dashboardId, controlType);
      await browserAuth.loginAsPrivilegedUser();
      await pageObjects.dashboard.openDashboardWithIdInEditMode(dashboardId);
      await pageObjects.dashboard.waitForPanelsToLoad(2);
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('defaultIndex', 'dateFormat:tz', 'timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'keeps a secondary layer bound to an identifier variable after the control changes',
      async ({ pageObjects }) => {
        const { dashboard, lens } = pageObjects;
        await openInlineEditorAndWaitVisible(pageObjects, RELATED_PANEL_ID);
        await lens.layers.activateLayerTab(1);

        // Submit through the secondary-layer editor to exercise the regression path:
        // raw grid columns previously lost their identifier-variable metadata here.
        await lens.workspace.submitEsqlQuery(FIELD_VARIABLE_QUERY);
        await dashboard.waitForRenderComplete();
        await applyLensInlineEditorAndWaitClosed({ lens });

        await expect(dashboard.getControlFramesLocator()).toHaveCount(1);
        const controlId = await dashboard.getOnlyControlId();
        await dashboard.optionsListOpenPopover(controlId);
        await dashboard.optionsListPopoverSelectOption('memory');
        await dashboard.waitForRenderComplete();

        const panel = dashboard.getPanelByEmbeddableId(RELATED_PANEL_ID);
        await expect(panel.locator('[data-test-subj="embeddableError"]')).toHaveCount(0);
        await expect(panel.locator('[data-test-subj="xyVisChart"]')).toBeVisible();
      }
    );

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
