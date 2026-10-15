/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  cancelLensInlineEditorAndWaitClosed,
  cleanupEsqlMultiLayerEnvironment,
  configureEsqlMultiLayerEnvironment,
  expectEsqlChartToRender,
  loadFreshEsqlMultiLayerDashboard,
  openInlineEditorAndWaitVisible,
  spaceTest,
  testData,
} from '../fixtures';

const LEFT = 'lnsXY_yReferenceLineLeftPanel';
const RIGHT = 'lnsXY_yReferenceLineRightPanel';
const TRIGGER = 'lns-dimensionTrigger-textBased';
const SINGLE_COLUMN_QUERY =
  'FROM logstash-* | STATS threshold = COUNT(*) * 0 + 42 | EVAL message = "threshold"';
const SHARED_QUERY =
  'FROM logstash-* | STATS lower = COUNT(*) / 20, upper = COUNT(*) / 10 | EVAL message = "thresholds"';

spaceTest.describe('Lens ES|QL reference lines', { tag: '@local-stateful-classic' }, () => {
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
    'shares a query between numeric lines and a static line',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      const dataQuery = await lens.workspace.getEsqlQuery();

      await lens.layers.createLayer('referenceLine');
      await lens.layers.ensureLayerTabIsActive(1);
      await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Visualization parameters' })).toBeVisible();
      await lens.workspace.submitEsqlQuery(SHARED_QUERY);

      await spaceTest.step('requires selection when several numeric outputs exist', async () => {
        await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
        await lens.dimensions.switchToEsql();
        const dimensionEditor = page.testSubj.locator('lnsDimensionContainer');
        await expect(dimensionEditor).toBeVisible();
        await expect(dimensionEditor.getByTestId('InlineEditingESQLEditor')).toHaveCount(0);
        await expect(page.testSubj.locator('InlineEditingESQLEditor')).toBeVisible();
        await expect
          .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
          .toStrictEqual([]);
        await lens.dimensions.openTextBasedDimensionFieldOptions();
        await expect(page.getByRole('option', { name: /lower/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /upper/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /message/ })).toBeVisible();
        await lens.dimensions.selectTextBasedDimensionField('lower');
        await lens.style.setAnnotationTextVisibility('name');
        await lens.closeDimensionEditor();
        await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('lower');
        await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('lower');
      });

      await spaceTest.step(
        'adds another query output and an independent static constant',
        async () => {
          await lens.dimensions.openDimensionEditor(`${LEFT} > lns-empty-dimension`, 1);
          await lens.dimensions.switchToEsql();
          await lens.dimensions.selectTextBasedDimensionField('upper');
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText([
            'lower',
            'upper',
          ]);

          await lens.dimensions.openDimensionEditor(`${LEFT} > lns-empty-dimension`, 1);
          await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '123');
          await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toHaveValue(
            '123'
          );
          await lens.closeDimensionEditor();
          await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText([
            'lower',
            'upper',
            'Static value: 123',
          ]);
          expect(await lens.workspace.getEsqlQuery()).toBe(SHARED_QUERY);
          await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
        }
      );

      await lens.layers.activateLayerTab(0);
      expect(await lens.workspace.getEsqlQuery()).toBe(dataQuery);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );

  spaceTest(
    'keeps the configured line until the replacement method is configured',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.layers.createLayer('referenceLine');
      await lens.layers.ensureLayerTabIsActive(1);
      await lens.workspace.submitEsqlQuery(SHARED_QUERY);

      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '123');
      await lens.style.setAnnotationTextVisibility('name');
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText(
        'Static value: 123'
      );
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('Static value: 123');

      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToEsql();
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual([]);
      await lens.closeDimensionEditor();
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText(
        'Static value: 123'
      );
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('Static value: 123');

      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToStaticValue();
      await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toHaveValue('123');
      await lens.closeDimensionEditor();
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('Static value: 123');

      await lens.workspace.submitEsqlQuery(SINGLE_COLUMN_QUERY);
      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToEsql();
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual(['threshold']);
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('threshold');
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('threshold');

      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToStaticValue();
      await expect(page.testSubj.locator('lns-indexPattern-static_value-input')).toHaveValue('42');
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('threshold');
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('threshold');

      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToStaticValue();
      await lens.workspace.setInputValue('lns-indexPattern-static_value-input', '43');
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText(
        'Static value: 43'
      );
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );

  spaceTest(
    'preserves the column and style when moving and duplicating a line',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.dimensions.setTextBasedDimensionField('lnsXY_yDimensionPanel', 'COUNT(*)');
      await lens.dimensions.openDimensionEditor(`lnsXY_yDimensionPanel > ${TRIGGER}`, 0, 1);
      await lens.dimensions.changeAxisSide('right', { inline: true });
      await lens.closeDimensionEditor();

      await lens.layers.createLayer('referenceLine');
      await lens.layers.ensureLayerTabIsActive(1);
      await lens.workspace.submitEsqlQuery(SINGLE_COLUMN_QUERY);
      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToEsql();
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual(['threshold']);
      await lens.style.setReferenceLineFillBelow();
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText('threshold');
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await expect(page.testSubj.locator(`${RIGHT} > lns-empty-dimension`)).toBeVisible();

      await lens.dragDrop.dragDimensionToDimension({
        from: `${LEFT} > ${TRIGGER}`,
        to: `${RIGHT} > lns-empty-dimension`,
      });
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveCount(0);
      await expect(lens.dimensions.getDimensionTriggersLocator(RIGHT)).toHaveText('threshold');
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.dimensions.openDimensionEditor(`${RIGHT} > ${TRIGGER}`, 1);
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual(['threshold']);
      await expect(lens.style.referenceLineFillBelowButton).toHaveAttribute('aria-pressed', 'true');
      await lens.closeDimensionEditor();
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);

      await lens.dragDrop.dragDimensionToDimension({
        from: `${RIGHT} > ${TRIGGER}`,
        to: `${RIGHT} > lns-empty-dimension`,
      });
      await expect(lens.dimensions.getDimensionTriggersLocator(RIGHT)).toHaveCount(2);
      await lens.dimensions.openDimensionEditor(`${RIGHT} > ${TRIGGER}`, 1, 1);
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual(['threshold']);
      await expect(lens.style.referenceLineFillBelowButton).toHaveAttribute('aria-pressed', 'true');
      await lens.closeDimensionEditor();
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );

  spaceTest(
    'renders a single line from a query returning multiple rows',
    async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      const query =
        'FROM logstash-* | SORT bytes DESC | EVAL threshold = bytes | KEEP threshold | LIMIT 2';
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.layers.createLayer('referenceLine');
      await lens.layers.ensureLayerTabIsActive(1);
      await lens.workspace.submitEsqlQuery(query);
      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToEsql();
      await expect
        .poll(() => lens.dimensions.getSelectedTextBasedDimensionFields())
        .toStrictEqual(['threshold']);
      await lens.style.setAnnotationTextVisibility('name');
      await lens.closeDimensionEditor();
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveText('threshold');
      expect(await lens.workspace.getEsqlQuery()).toBe(query);
      await cancelLensInlineEditorAndWaitClosed({ lens });
    }
  );

  for (const { title, query, field } of [
    {
      title: 'empty results',
      query: 'FROM logstash-* | EVAL threshold = 10.0 | KEEP threshold | LIMIT 0',
      field: 'threshold',
    },
    {
      title: 'null results',
      query: 'FROM logstash-* | STATS threshold = AVG(bytes) | EVAL threshold = TO_DOUBLE(null)',
      field: 'threshold',
    },
    {
      title: 'nonnumeric results',
      query: SHARED_QUERY,
      field: 'message',
    },
  ]) {
    spaceTest(`does not render a misleading line for ${title}`, async ({ page, pageObjects }) => {
      const { dashboard, lens } = pageObjects;
      await openInlineEditorAndWaitVisible(pageObjects, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await lens.layers.createLayer('referenceLine');
      await lens.layers.ensureLayerTabIsActive(1);
      await lens.workspace.submitEsqlQuery(query);
      await lens.dimensions.openDimensionEditor(`${LEFT} > ${TRIGGER}`, 1);
      await lens.dimensions.switchToEsql();
      await lens.dimensions.selectTextBasedDimensionField(field);
      await lens.style.setAnnotationTextVisibility('name');
      await lens.closeDimensionEditor();
      await expect(lens.dimensions.getDimensionTriggersLocator(LEFT)).toHaveText(field);
      await expectEsqlChartToRender(dashboard, testData.ESQL_MULTI_LAYER_PANEL_IDS.DATA);
      await expect(page.testSubj.locator('xyVisAnnotationText')).toHaveCount(0);
      await lens.dimensions.hoverTextBasedDimensionTrigger(LEFT, 1);
      await expect(page.getByRole('tooltip')).toContainText(
        'The reference line requires a numeric value in the first result row.'
      );
      await cancelLensInlineEditorAndWaitClosed({ lens });
    });
  }
});
