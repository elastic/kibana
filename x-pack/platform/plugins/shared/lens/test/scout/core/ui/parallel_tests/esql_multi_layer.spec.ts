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
  getImportedDashboardId,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const COUNT_QUERY =
  'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS COUNT(*) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
const MAX_QUERY =
  'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS MAX(bytes) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend) | LIMIT 100';
const INVALID_QUERY = 'FROM logstash-* | STATS';
const INCOMPATIBLE_QUERY = 'FROM logstash-* | KEEP message | LIMIT 100';

const X_DIMENSION = 'lnsXY_xDimensionPanel';
const Y_DIMENSION = 'lnsXY_yDimensionPanel';
const ANNOTATIONS_DIMENSION = 'lnsXY_xAnnotationsPanel';
const REFERENCE_LINE_DIMENSION = 'lnsXY_yReferenceLineLeftPanel';

spaceTest.describe('Lens ES|QL multi-layer editing', { tag: '@local-stateful-classic' }, () => {
  let dashboardId: string;

  spaceTest.beforeAll(async ({ scoutSpace }) => {
    const savedObjects = await scoutSpace.savedObjects.load(
      testData.KBN_ARCHIVE_PATHS.ESQL_MULTI_LAYER_DASHBOARD
    );
    dashboardId = getImportedDashboardId(savedObjects, 'ESQL Multi-layer Dashboard');

    await scoutSpace.uiSettings.set({
      'dateFormat:tz': 'UTC',
      'timepicker:timeDefaults': `{ "from": "${testData.LOGSTASH_IN_RANGE_DATES.from}", "to": "${testData.LOGSTASH_IN_RANGE_DATES.to}"}`,
    });
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.dashboard.openDashboardWithIdInEditMode(dashboardId);
    await pageObjects.dashboard.waitForPanelsToLoad(2);
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await scoutSpace.uiSettings.unset('dateFormat:tz', 'timepicker:timeDefaults');
    await scoutSpace.savedObjects.cleanStandardList();
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
    await dashboard.waitForRenderComplete();

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
    'keeps text-based and form-based data layers independent',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(
        pageObjects,
        testData.ESQL_MULTI_LAYER_PANEL_IDS.MIXED_DATA
      );
      expect(await lens.layers.getLayerCount()).toBe(2);
      expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);

      await lens.layers.activateLayerTab(1);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText(Y_DIMENSION))
        .toBe('Median of bytes');

      await lens.layers.activateLayerTab(0);
      await lens.workspace.submitEsqlQuery(MAX_QUERY);
      await dashboard.waitForRenderComplete();

      await lens.layers.activateLayerTab(1);
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText(Y_DIMENSION))
        .toBe('Median of bytes');

      await lens.layers.activateLayerTab(0);
      await addDataLayer(page, 'line', 2);
      expect(await lens.layers.getLayerCount()).toBe(3);
      expect(await lens.workspace.getEsqlQuery()).toBe(MAX_QUERY);
      await lens.dimensions.setTextBasedDimensionField(X_DIMENSION, '@timestamp', 2);
      await lens.dimensions.setTextBasedDimensionField(Y_DIMENSION, 'MAX(bytes)', 2);
      await dashboard.waitForRenderComplete();

      await lens.layers.activateLayerTab(1);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      await expect
        .poll(() => lens.dimensions.getDimensionTriggerText(Y_DIMENSION))
        .toBe('Median of bytes');
    }
  );

  spaceTest(
    'combines ES|QL data with annotation and reference-line layers',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.layers.createLayer('annotations');
      expect(await lens.layers.getLayerCount()).toBe(2);
      await lens.layers.ensureLayerTabIsActive(1);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
      await expect(lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS_DIMENSION)).toHaveText(
        'Event'
      );

      await lens.layers.activateLayerTab(0);
      expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
      await lens.layers.createLayer('referenceLine');
      expect(await lens.layers.getLayerCount()).toBe(3);
      await lens.layers.ensureLayerTabIsActive(2);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
      expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
      expect(await lens.dimensions.getDimensionTriggerText(REFERENCE_LINE_DIMENSION)).toMatch(
        /^Static value: /
      );

      await dashboard.waitForRenderComplete();
      await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

      await applyLensInlineEditorAndWaitClosed({ lens });
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      expect(await lens.layers.getLayerCount()).toBe(3);
    }
  );

  spaceTest(
    'rejects invalid or incompatible queries on one layer',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;

      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await addDataLayer(page);
      await lens.dimensions.setTextBasedDimensionField(X_DIMENSION, '@timestamp', 1);
      await lens.dimensions.setTextBasedDimensionField(Y_DIMENSION, 'COUNT(*)', 1);
      await dashboard.waitForRenderComplete();

      await lens.workspace.submitEsqlQuery(INVALID_QUERY);
      const errorButton = page.getByRole('button', { name: '1 error' });
      await expect(errorButton).toBeVisible();
      await errorButton.click();
      await expect(page.getByRole('dialog', { name: 'Errors' })).toContainText(
        'At least one aggregation or grouping expression required in [STATS]'
      );
      await page.keyboard.press('Escape');
      await expect(lens.applyFlyoutButton).toBeDisabled();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

      await lens.workspace.submitEsqlQuery(INCOMPATIBLE_QUERY);
      await expect(errorButton).toBeVisible();
      await errorButton.click();
      await expect(page.getByRole('dialog', { name: 'Errors' })).toContainText(
        'does not contain compatible fields for every configured dimension'
      );
      await page.keyboard.press('Escape');
      await expect(lens.applyFlyoutButton).toBeDisabled();
      await expect(page.testSubj.locator('embeddableError')).toHaveCount(0);

      await lens.layers.activateLayerTab(0);
      expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );
});
