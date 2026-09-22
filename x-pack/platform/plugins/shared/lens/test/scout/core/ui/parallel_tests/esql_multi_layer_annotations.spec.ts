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

const COUNT_QUERY =
  'FROM logstash-* | WHERE @timestamp >= ?_tstart AND @timestamp <= ?_tend | STATS COUNT(*) BY @timestamp = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';
const ANNOTATIONS_DIMENSION = 'lnsXY_xAnnotationsPanel';
const REFERENCE_LINE_DIMENSION = 'lnsXY_yReferenceLineLeftPanel';

spaceTest.describe(
  'Lens ES|QL annotation and reference-line layers',
  { tag: '@local-stateful-classic' },
  () => {
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
      'combines ES|QL data with annotation and reference-line layers',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await lens.layers.createLayer('annotations', undefined, { annotationsAddDirectly: true });
        expect(await lens.layers.getLayerCount()).toBe(2);
        await lens.layers.ensureLayerTabIsActive(1);
        await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
        await expect(lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS_DIMENSION)).toHaveText(
          'Event'
        );
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        await lens.layers.activateLayerTab(0);
        expect(await lens.workspace.getEsqlQuery()).toBe(COUNT_QUERY);
        await lens.layers.createLayer('referenceLine');
        expect(await lens.layers.getLayerCount()).toBe(3);
        await lens.layers.ensureLayerTabIsActive(2);
        await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeHidden();
        expect(await lens.dimensions.getDimensionTriggerText(REFERENCE_LINE_DIMENSION)).toMatch(
          /^Static value: /
        );

        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();

        await applyLensInlineEditorAndWaitClosed({ lens });
        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        expect(await lens.layers.getLayerCount()).toBe(3);
        await cancelLensInlineEditorAndWaitClosed({ lens });

        // Persistence: annotation + reference line layers survive a dashboard save and full reload.
        await dashboard.saveChangesToExistingDashboard();
        await expect(page.testSubj.locator('dashboardQuickSaveMenuItem')).toBeEnabled();

        await page.reload();
        await dashboard.waitForRenderComplete();
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();

        await dashboard.ensureEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        expect(await lens.layers.getLayerCount()).toBe(3);
        await lens.layers.ensureLayerTabIsActive(1);
        await expect(lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS_DIMENSION)).toHaveText(
          'Event'
        );
        await lens.layers.activateLayerTab(2);
        expect(await lens.dimensions.getDimensionTriggerText(REFERENCE_LINE_DIMENSION)).toMatch(
          /^Static value: /
        );
        await cancelLensInlineEditorAndWaitClosed({ lens });
      }
    );

    spaceTest(
      'enables apply after editing a persisted reference line on an ES|QL panel',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await lens.layers.createLayer('referenceLine');
        await applyLensInlineEditorAndWaitClosed({ lens });
        await dashboard.saveChangesToExistingDashboard();

        await page.reload();
        await dashboard.waitForRenderComplete();
        await dashboard.ensureEditMode();
        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await lens.layers.activateLayerTab(1);
        await lens.dimensions.openDimensionEditor(
          `${REFERENCE_LINE_DIMENSION} > lns-dimensionTrigger`,
          1
        );
        await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '250');
        await lens.closeDimensionEditor();
        await expect(
          lens.dimensions.getDimensionTriggersLocator(REFERENCE_LINE_DIMENSION)
        ).toHaveText('Static value: 250');
        await expect(lens.applyFlyoutButton).toBeEnabled();
      }
    );

    spaceTest(
      'hides data-view-dependent controls on annotation and reference line layers',
      async ({ page, pageObjects }) => {
        const { lens } = pageObjects;

        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        // The annotations menu item adds the layer directly: ES|QL charts hide the
        // "Load from library" option, so no annotation-method submenu appears.
        await lens.layers.createLayer('annotations', undefined, { annotationsAddDirectly: true });
        await expect(page.testSubj.locator('lnsAnnotationLayer_new')).toHaveCount(0);
        await expect(page.testSubj.locator('lnsAnnotationLayer_addFromLibrary')).toHaveCount(0);

        await lens.layers.ensureLayerTabIsActive(1);
        // No data view switcher, layer settings (ignore global filters), or data-view-based
        // "Save to library" action on the annotation layer.
        await expect(page.testSubj.locator('lns_layerIndexPatternLabel')).toHaveCount(0);
        await expect(page.testSubj.locator('lnsLayerSettings')).toHaveCount(0);
        await lens.layers.openLayerActions(1);
        await expect(page.testSubj.locator('lnsXY_annotationLayer_saveToLibrary')).toHaveCount(0);
        await lens.layers.closeLayerActions();

        // The annotation editor is manual-only: no placement type switch (no "Custom query").
        await lens.dimensions.openDimensionEditor(
          `${ANNOTATIONS_DIMENSION} > lns-dimensionTrigger`,
          1
        );
        await expect(page.testSubj.locator('lns-xyAnnotation-placementType')).toHaveCount(0);
        await expect(page.testSubj.locator('lns-xyAnnotation-time')).toBeVisible();
        await lens.closeDimensionEditor();

        await lens.layers.activateLayerTab(0);
        await lens.layers.createLayer('referenceLine');
        await lens.layers.ensureLayerTabIsActive(2);
        // No data view switcher on the reference line layer.
        await expect(page.testSubj.locator('lns_layerIndexPatternLabel')).toHaveCount(0);

        // The reference line dimension editor is static-value-only: no
        // Static value / Quick function / Formula tabs and no field selector.
        await lens.dimensions.openDimensionEditor(
          `${REFERENCE_LINE_DIMENSION} > lns-dimensionTrigger`,
          2
        );
        await expect(page.testSubj.locator('lens-dimensionTabs')).toHaveCount(0);
        await expect(page.testSubj.locator('indexPattern-dimension-field')).toHaveCount(0);
        await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toBeVisible();
        await lens.closeDimensionEditor();

        await cancelLensInlineEditorAndWaitClosed({ lens });
      }
    );

    spaceTest(
      'edits, styles and duplicates annotations and reference lines',
      async ({ page, pageObjects }) => {
        const { dashboard, lens } = pageObjects;

        await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        await lens.layers.createLayer('annotations', undefined, { annotationsAddDirectly: true });
        await lens.layers.ensureLayerTabIsActive(1);

        // Edit the manual annotation: rename it and show its name as text label.
        await lens.dimensions.openDimensionEditor(
          `${ANNOTATIONS_DIMENSION} > lns-dimensionTrigger`,
          1
        );
        await lens.workspace.setInputValue('name-input', 'Deploy marker');
        // wait for the debounced rename to commit (reflected in the dimension
        // trigger) before the next state update — otherwise the stale debounced
        // snapshot would overwrite the text-visibility toggle
        await expect(lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS_DIMENSION)).toHaveText(
          'Deploy marker'
        );
        await lens.style.setAnnotationTextVisibility('name');
        // Let the applied changes settle into a completed panel render before dragging:
        // dropping while the chart still reflects pre-edit state can land on stale state
        // and silently discard the change (pattern from reference_lines.spec.ts, adapted
        // to inline editing where no lnsWorkspace render counter exists).
        await lens.closeDimensionEditor();
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await expect(page.testSubj.locator('xyVisAnnotationIcon')).toBeVisible();
        await expect(page.testSubj.locator('xyVisAnnotationText')).toBeVisible();

        // Duplicating copies the exact same static date, so both annotations land on the
        // same point and render as one grouped icon.
        await lens.dragDrop.dragDimensionToDimension({
          from: `${ANNOTATIONS_DIMENSION} > lns-dimensionTrigger`,
          to: `${ANNOTATIONS_DIMENSION} > lns-empty-dimension`,
        });
        await expect(
          lens.dimensions.getDimensionTriggersLocator(ANNOTATIONS_DIMENSION)
        ).toHaveCount(2);
        await expect(page.testSubj.locator('xyVisGroupedAnnotationIcon')).toHaveCount(1);
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        // Reference line: set a custom static value and a below-fill style.
        await lens.layers.activateLayerTab(0);
        await lens.layers.createLayer('referenceLine');
        await lens.layers.ensureLayerTabIsActive(2);

        await lens.dimensions.openDimensionEditor(
          `${REFERENCE_LINE_DIMENSION} > lns-dimensionTrigger`,
          2
        );
        await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '1000');
        // wait for the debounced value change to commit before the next state update
        // (same stale-snapshot race as the annotation rename above)
        await expect(
          lens.dimensions.getDimensionTriggersLocator(REFERENCE_LINE_DIMENSION)
        ).toHaveText('Static value: 1000');
        await lens.style.setReferenceLineFillBelow();
        // settle the applied changes into a completed panel render before dragging
        await lens.closeDimensionEditor();
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        // Duplicating a reference line carries its value and style.
        await lens.dragDrop.dragDimensionToDimension({
          from: `${REFERENCE_LINE_DIMENSION} > lns-dimensionTrigger`,
          to: `${REFERENCE_LINE_DIMENSION} > lns-empty-dimension`,
        });
        const duplicatedReferenceLineTriggers =
          lens.dimensions.getDimensionTriggersLocator(REFERENCE_LINE_DIMENSION);
        await expect(duplicatedReferenceLineTriggers).toHaveText([
          'Static value: 1000',
          'Static value: 1000 [1]',
        ]);
        await lens.dimensions.openDimensionEditor(
          `${REFERENCE_LINE_DIMENSION} > lns-dimensionTrigger`,
          2,
          1
        );
        await expect(page.testSubj.locator('lnsXY_fill_below')).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await lens.closeDimensionEditor();
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        // Adding a value via the empty dimension button routes the new static value
        // column to the form-based datasource even though the chart's active
        // datasource is text-based (regression: the column used to land in the
        // text-based state, breaking the panel with an invalid-column error).
        await lens.dimensions.openDimensionEditor(
          `${REFERENCE_LINE_DIMENSION} > lns-empty-dimension`,
          2
        );
        // wait for the pre-filled static value before closing — it reflects the new
        // column committed to state; closing earlier discards the pending dimension.
        // (the trigger list itself is not queryable here: the dimension editor
        // replaces the layer panel while open)
        await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toHaveValue(
          /\d/
        );
        await lens.closeDimensionEditor();
        const referenceTriggers =
          lens.dimensions.getDimensionTriggersLocator(REFERENCE_LINE_DIMENSION);
        await expect(referenceTriggers).toHaveCount(3);
        // every trigger carries a static value, proving initializeDimension ran
        // against the form-based datasource for the newly added dimension too
        await expect(referenceTriggers).toHaveText([
          /^Static value: /,
          /^Static value: /,
          /^Static value: /,
        ]);
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

        await cancelLensInlineEditorAndWaitClosed({ lens });
      }
    );
  }
);
