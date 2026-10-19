/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  addDataLayer,
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
const INVALID_QUERY = 'FROM logstash-* | STATS';
const INCOMPATIBLE_QUERY = 'FROM logstash-* | KEEP geo.src | LIMIT 100';
const X_DIMENSION = 'lnsXY_xDimensionPanel';
const Y_DIMENSION = 'lnsXY_yDimensionPanel';

spaceTest.describe('Lens ES|QL layer query validation', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await configureEsqlMultiLayerEnvironment(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects, scoutSpace }) => {
    await loadFreshEsqlMultiLayerDashboard({
      scoutSpace,
      browserAuth,
      dashboard: pageObjects.dashboard,
    });
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupEsqlMultiLayerEnvironment(scoutSpace);
  });

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
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      await lens.workspace.submitEsqlQuery(INCOMPATIBLE_QUERY);
      await expect(errorButton).toBeVisible();
      await errorButton.click();
      await expect(page.getByRole('dialog', { name: 'Errors' })).toContainText(
        'does not contain compatible fields for every configured dimension'
      );
      await page.keyboard.press('Escape');
      await expect(lens.applyFlyoutButton).toBeDisabled();
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      await lens.layers.activateLayerTab(0);
      expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );
});
