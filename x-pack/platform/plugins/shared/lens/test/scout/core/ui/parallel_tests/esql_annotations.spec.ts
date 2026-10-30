/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
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

const ANNOTATIONS = 'lnsXY_xAnnotationsPanel';
const POINT_QUERY = 'FROM logstash-* | WHERE geo.src == "CN" | KEEP @timestamp, geo.dest, geo.src';
const RANGE_QUERY =
  'FROM logstash-* | WHERE geo.src == "US" | EVAL end = @timestamp + 30 minutes | KEEP @timestamp, end | LIMIT 5';

spaceTest.describe('Lens ES|QL annotations', { tag: '@local-stateful-classic' }, () => {
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
    'renders, saves and reloads ES|QL point and range annotations',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      const panelId = testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA;
      const panel = dashboard.getPanelByEmbeddableId(panelId);
      // Close events share a marker that shows their count instead of an icon
      const annotationMarkers = () =>
        panel
          .getByTestId('xyVisAnnotationIcon')
          .or(panel.getByTestId('xyVisGroupedAnnotationIcon'));
      await openInlineEditorAndWaitVisible(pageObjects, panelId);

      await spaceTest.step('add a point annotation bound to result columns', async () => {
        await lens.layers.createLayer('annotations', undefined, { annotationsAddDirectly: true });
        await lens.layers.ensureLayerTabIsActive(1);
        await lens.dimensions.openDimensionEditor(`${ANNOTATIONS} > lns-dimensionTrigger`, 1);
        await lens.style.configureEsqlAnnotation({
          query: POINT_QUERY,
          timeColumn: '@timestamp',
          textColumn: 'geo.dest',
          tooltipColumns: ['geo.src'],
        });
        // Selecting a text column switches text decoration to the column ("Field")
        await expect(page.testSubj.locator('lnsXY_textVisibility_field')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        // Markers only render when the query is restricted to the chart time range
        await expectEsqlChartToRender(dashboard, panelId);
        await expect.poll(() => annotationMarkers().count()).toBeGreaterThan(0);
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('add a range annotation from start and end columns', async () => {
        await lens.dimensions.openDimensionEditor(`${ANNOTATIONS} > lns-empty-dimension`, 1);
        await lens.style.configureEsqlAnnotation({
          query: RANGE_QUERY,
          timeColumn: '@timestamp',
          endTimeColumn: 'end',
        });
        await lens.closeDimensionEditor();
        await expect(lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS)).toHaveCount(2);
        await expectEsqlChartToRender(dashboard, panelId);
      });

      await spaceTest.step('apply, save and reload the dashboard', async () => {
        await applyLensInlineEditorAndWaitClosed({ lens });
        await dashboard.saveChangesToExistingDashboard();
        await page.reload();
        await dashboard.waitForRenderComplete();
        await expectEsqlChartToRender(dashboard, panelId);
        await expect.poll(() => annotationMarkers().count()).toBeGreaterThan(0);
      });

      await spaceTest.step('reopen the editor with queries and bindings restored', async () => {
        await dashboard.ensureEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, panelId);
        await lens.layers.activateLayerTab(1);

        await lens.dimensions.openDimensionEditor(`${ANNOTATIONS} > lns-dimensionTrigger`, 1, 0);
        await expect(page.testSubj.locator('lnsXY_annotation_esql')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await expect(page.testSubj.locator('lnsXY-annotation-esql-timeColumn')).toHaveValue(
          '@timestamp'
        );
        await expect(page.testSubj.locator('lnsXY-annotation-esql-textColumn')).toHaveValue(
          'geo.dest'
        );
        await lens.closeDimensionEditor();

        await lens.dimensions.openDimensionEditor(`${ANNOTATIONS} > lns-dimensionTrigger`, 1, 1);
        await expect(page.testSubj.locator('lnsXY-annotation-esql-endTimeColumn')).toHaveValue(
          'end'
        );
        await lens.closeDimensionEditor();
        await cancelLensInlineEditorAndWaitClosed({ lens });
      });
    }
  );

  spaceTest(
    'skips ES|QL annotation rows without a valid end time instead of failing the chart',
    async ({ pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      const panelId = testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA;
      await openInlineEditorAndWaitVisible(pageObjects, panelId);

      await lens.layers.createLayer('annotations', undefined, { annotationsAddDirectly: true });
      await lens.layers.ensureLayerTabIsActive(1);
      await lens.dimensions.openDimensionEditor(`${ANNOTATIONS} > lns-dimensionTrigger`, 1);
      await lens.style.configureEsqlAnnotation({
        query:
          'FROM logstash-* | EVAL end = CASE(geo.src == "CN", null, @timestamp + 30 minutes) | KEEP @timestamp, end, geo.src | LIMIT 20',
        timeColumn: '@timestamp',
        endTimeColumn: 'end',
      });
      await lens.closeDimensionEditor();

      await expectEsqlChartToRender(dashboard, panelId);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );
});
