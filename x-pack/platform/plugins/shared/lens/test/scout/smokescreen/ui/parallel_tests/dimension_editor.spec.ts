/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NULL_LABEL } from '@kbn/field-formats-common';
import { expect } from '@kbn/scout/ui';
import {
  createLogstashLensEditorSuiteSetup,
  getImportedSavedObjectId,
  spaceTest,
  testData,
} from '../fixtures';

const LONG_DIMENSION_LABEL =
  'Veryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryveryvery long label wrapping multiple lines';

/** Three percentiles of the same field, which Lens has to collapse into one `percentiles` agg. */
const PERCENTILE_VALUES = [90, 95.5, 99.9] as const;

spaceTest.describe('Lens dimension editor', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup({
    loadLensArchives: true,
    skipEmptyLensOpen: true,
  });

  let xyVisId: string;

  spaceTest.beforeAll(async ({ scoutSpace, apiServices }) => {
    const imported = await suiteSetup.beforeAll({ scoutSpace, apiServices });
    xyVisId = getImportedSavedObjectId(imported, 'lens', testData.LENS_BASIC_TITLES.XY_VIS);
  });

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'edits label, format, color, style, and a long label on a saved XY chart',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await spaceTest.step('edit label, format, color, curve, and missing values', async () => {
        await lens.workspace.openEditor(xyVisId, 'xyVisChart');
        await lens.dimensions.removeDimension('lnsXY_splitDimensionPanel');
        await lens.switchToVisualization('line', { search: 'line' });
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
          operation: 'max',
          field: 'memory',
          keepOpen: true,
        });
        await lens.dimensions.editDimensionLabel('Test of label');
        await lens.dimensions.editDimensionFormat('Percent');
        await lens.dimensions.editDimensionColor('#ff0000');

        // Existing style PO does not close the dimension editor (FTR did). Close first.
        await lens.closeDimensionEditor();
        await lens.style.openStyleSettingsFlyout();
        await lens.style.setCurvedLines('Smooth');
        await lens.style.editMissingValues('Linear');
        // The SuperSelect button also renders a hidden screen-reader suffix ("Linear, ").
        await expect(lens.style.missingValuesSelect).toContainText('Linear');
        await lens.style.closeFlyoutWithBackButton();

        await lens.dimensions.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
        await expect(lens.dimensions.dimensionColorPicker).toHaveValue(/#ff0000/i);
        await expect(lens.dimensions.formatDecimalsInput).toBeVisible();
        await lens.closeDimensionEditor();
        expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
          'Test of label'
        );
      });

      await spaceTest.step('hides the static value tab for data layers', async () => {
        await lens.dimensions.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
        await expect(lens.dimensions.quickFunctionsTab).toBeVisible();
        await expect(lens.dimensions.formulaTab).toBeVisible();
        await expect(lens.dimensions.staticValueTab).toBeHidden();
        await lens.closeDimensionEditor();
      });

      await spaceTest.step('keeps a very long label removable', async () => {
        await lens.dimensions.openDimensionEditor('lnsXY_yDimensionPanel > lns-dimensionTrigger');
        await lens.dimensions.editDimensionLabel(LONG_DIMENSION_LABEL);
        await lens.waitForVisualization('xyVisChart');
        await lens.closeDimensionEditor();

        expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
          LONG_DIMENSION_LABEL
        );
        const removeButton = lens.dimensions.getDimensionRemoveLocator('lnsXY_yDimensionPanel');
        await removeButton.hover();
        await expect(removeButton).toBeVisible();
        await lens.dimensions.removeDimension('lnsXY_yDimensionPanel');
        await expect(
          lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')
        ).toHaveCount(0);
      });
    }
  );

  spaceTest('creates a valid XY chart with references', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'moving_average',
      keepOpen: true,
    });
    await lens.dimensions.configureReference({
      operation: 'Sum',
      field: 'bytes',
    });
    await lens.closeDimensionEditor();

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'cumulative_sum',
      keepOpen: true,
    });
    await lens.dimensions.configureReference({
      field: 'Records',
    });
    await lens.closeDimensionEditor();

    await lens.waitForVisualization('xyVisChart');
    await expect(lens.workspace.xyLegendItems).toHaveCount(2);
  });

  spaceTest('allows formatting on references', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.switchToVisualization('lnsDatatable', { search: 'table' });
    await lens.configureDimension({
      dimension: 'lnsDatatable_rows > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
      disableEmptyRows: true,
    });
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'moving_average',
      keepOpen: true,
    });
    await lens.dimensions.configureReference({
      operation: 'Sum',
      field: 'bytes',
    });
    await lens.dimensions.editDimensionFormat('Number');
    await lens.closeDimensionEditor();
    await lens.waitForVisualization();

    await expect(lens.datatable.getCellLocator(0, 1)).toContainText(NULL_LABEL);
    await expect(lens.datatable.getCellLocator(1, 1)).toContainText('222,420.00');
    await expect(lens.datatable.getCellLocator(2, 1)).toContainText('702,050.00');
    await expect(lens.datatable.getCellLocator(3, 1)).toContainText('1,879,613.33');
    await expect(lens.datatable.getCellLocator(4, 1)).toContainText('3,482,256.25');
    await expect(lens.datatable.getCellLocator(5, 1)).toContainText('4,359,953.00');
  });

  spaceTest('handles edge cases in reference-based operations', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.configureDimension({
      dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
      operation: 'date_histogram',
      field: '@timestamp',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'cumulative_sum',
    });
    expect(await lens.workspace.getErrorCount()).toBe(1);

    await lens.dimensions.removeDimension('lnsXY_xDimensionPanel');
    expect(await lens.workspace.getErrorCount()).toBe(2);

    await lens.dragDrop.dragFieldToDimensionTrigger(
      '@timestamp',
      'lnsXY_xDimensionPanel > lns-empty-dimension'
    );
    expect(await lens.workspace.getErrorCount()).toBe(1);

    await lens.openChartSwitchPopover({ visType: 'lnsDatatable', search: 'table' });
    await expect(lens.getChartSwitchOption('lnsDatatable')).toBeVisible();
    await expect(lens.getChartSwitchWarning('lnsDatatable')).toBeHidden();
    await lens.selectChartSwitchOption('lnsDatatable');

    expect(await lens.dimensions.getDimensionTriggerText('lnsDatatable_metrics')).toBe(
      'Cumulative sum of (incomplete)'
    );
  });

  spaceTest(
    'keeps the field selection while transitioning to every reference-based operation',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;
      await suiteSetup.openEmptyLensEditor(pageObjects);

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'counter_rate',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'cumulative_sum',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'differences',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'moving_average',
      });

      expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
        'Moving average of Sum of bytes'
      );
    }
  );

  spaceTest(
    'does not leave an incomplete column for a field-based operation',
    async ({ page, pageObjects }) => {
      const { lens } = pageObjects;
      await suiteSetup.openEmptyLensEditor(pageObjects);

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'min',
      });

      await expect(
        page.testSubj.locator('lnsXY_yDimensionPanel > lns-empty-dimension')
      ).toBeVisible();
      await expect(
        lens.dimensions.getDimensionTriggersLocator('lnsXY_yDimensionPanel')
      ).toHaveCount(0);
    }
  );

  spaceTest(
    'reverts to the previous configuration when picking an incompatible operation',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;
      await suiteSetup.openEmptyLensEditor(pageObjects);

      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });
      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'moving_average',
        field: 'Records',
      });
      expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
        'Moving average of Count of records'
      );

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
        operation: 'median',
        isPreviousIncompatible: true,
        keepOpen: true,
      });
      await expect(lens.dimensions.editorCloseButton).toBeVisible();
      await lens.closeDimensionEditor();
      expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
        'Moving average of Count of records'
      );
    }
  );

  spaceTest('transitions from unique count to last value', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
      operation: 'unique_count',
      field: 'ip',
    });
    await lens.configureDimension({
      dimension: 'lnsXY_yDimensionPanel > lns-dimensionTrigger',
      operation: 'last_value',
      field: 'bytes',
      isPreviousIncompatible: true,
      keepOpen: true,
    });
    await lens.waitForVisualization('xyVisChart');
    await lens.closeDimensionEditor();
    expect(await lens.dimensions.getDimensionTriggerText('lnsXY_yDimensionPanel')).toBe(
      'Last value of bytes'
    );
  });

  spaceTest('optimizes multiple percentile metrics', async ({ pageObjects }) => {
    const { lens } = pageObjects;
    await suiteSetup.openEmptyLensEditor(pageObjects);

    for (const percentile of PERCENTILE_VALUES) {
      await spaceTest.step(`adds the ${percentile}th percentile of bytes`, async () => {
        await lens.configureDimension({
          dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
          operation: 'percentile',
          field: 'bytes',
          keepOpen: true,
        });
        // EuiRange with `showInput` stamps the test-subj on the slider too.
        await lens.workspace.setInputValue('lns-indexPattern-percentile-input', `${percentile}`, {
          inputType: 'number',
        });
        // The value is debounced (~256ms) before it reaches Lens state, and the pending commit
        // carries the column the editor captured — so it must land before the next dimension is
        // added. The trigger label is the only DOM signal that it did.
        await expect
          .poll(() => lens.dimensions.getDimensionTriggersTexts('lnsXY_yDimensionPanel'))
          .toContain(`${percentile}th percentile of bytes`);
        await lens.closeDimensionEditor();
      });
    }

    await lens.waitForVisualization('xyVisChart');
    expect(await lens.workspace.getErrorCount()).toBe(0);
  });
});
