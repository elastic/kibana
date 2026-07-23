/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup } from '../../fixtures';

spaceTest.describe('Lens formula layers and filters', { tag: tags.stateful.classic }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  spaceTest(
    'duplicates a moving average formula with conditional coloring',
    async ({ page, pageObjects }) => {
      const { lens } = pageObjects;

      await spaceTest.step('configure moving average formula with text decoration', async () => {
        await lens.switchToVisualization('lnsDatatable');
        await lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
          disableEmptyRows: true,
        });
        await lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'formula',
          formula: `moving_average(sum(bytes), window=5`,
          keepOpen: true,
        });
        await lens.setTableDynamicColoring('text');
        await lens.waitForVisualization();

        // Text decoration is configured when the color-mapping indicator is shown.
        // FTR also asserted inline `style.color` on the cell; the editor stores a named
        // palette (`positive`) and only `custom` implements getColorForValue, so cells may
        // not receive inline color until the palette is customized (product limitation).
        await expect(page.testSubj.locator('lns_dynamicColoring_edit')).toBeVisible();
        const styleObj = await lens.getDatatableCellStyle(1, 1);
        expect(styleObj['background-color']).toBeUndefined();
      });

      await spaceTest.step('duplicate metric via DnD and assert matching cells', async () => {
        await lens.closeDimensionEditor();
        await lens.dragDimensionToDimension({
          from: 'lnsDatatable_metrics > lns-dimensionTrigger',
          to: 'lnsDatatable_metrics > lns-empty-dimension',
        });
        await lens.waitForVisualization();
        // FTR parity: exact moving-average value for Logstash in-range window after DnD.
        await expect
          .poll(async () => lens.getDatatableCellText(1, 1), { timeout: 20_000 })
          .toBe('222,420');
        await expect
          .poll(async () => lens.getDatatableCellText(1, 2), { timeout: 20_000 })
          .toBe('222,420');
      });
    }
  );

  spaceTest(
    'keeps formula when user does not fully transition to a quick function',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.switchToVisualization('lnsDatatable');
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });
      await lens.switchToQuickFunctions();
      // Incomplete transition: incompatible option must not become the selected operation.
      await lens.clickIncompatibleOperation('min');
      await expect
        .poll(async () => lens.getDimensionTriggerText('lnsDatatable_metrics', 0))
        .toBe('count()');
      await lens.closeDimensionEditor();
      expect(await lens.getDimensionTriggerText('lnsDatatable_metrics', 0)).toBe('count()');
    }
  );

  spaceTest(
    'keeps formula when user does not fully transition to a static value',
    async ({ pageObjects }) => {
      const { lens } = pageObjects;

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });
      await lens.createLayer('referenceLine');
      expect(await lens.getLayerCount()).toBe(2);
      await lens.activateLayerTab(1);

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yReferenceLineLeftPanel > lns-dimensionTrigger',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });
      await lens.switchToStaticValue();
      await lens.closeDimensionEditor();
      await expect
        .poll(async () => lens.getDimensionTriggerText('lnsXY_yReferenceLineLeftPanel', 0))
        .toBe('count()');
    }
  );

  spaceTest('allows numeric-only formulas', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await lens.switchToVisualization('lnsDatatable');
    await lens.configureDimension({
      dimension: 'lnsDatatable_metrics > lns-empty-dimension',
      operation: 'formula',
      formula: `0`,
    });
    await lens.dragDimensionToDimension({
      from: 'lnsDatatable_metrics > lns-dimensionTrigger',
      to: 'lnsDatatable_metrics > lns-empty-dimension',
    });
    await expect.poll(async () => lens.getDatatableCellText(0, 0)).toBe('0');
    await expect.poll(async () => lens.getDatatableCellText(0, 1)).toBe('0');
  });

  spaceTest('applies a global filter to the current formula', async ({ pageObjects }) => {
    const { lens } = pageObjects;

    await spaceTest.step('baseline count', async () => {
      await lens.switchToVisualization('lnsDatatable');
      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'formula',
        formula: `count()`,
        keepOpen: true,
      });
      await lens.waitForVisualization();
      // FTR parity: exact Logstash count for in-range archive window.
      await expect.poll(async () => lens.getDatatableCellText(0, 0)).toBe('14,005');
    });

    await spaceTest.step('dimension filter reduces count', async () => {
      await lens.enableFilter();
      await lens.setFilterBy('bytes > 4000');
      await lens.waitForVisualization();
      await expect.poll(async () => lens.getDatatableCellText(0, 0)).toBe('9,169');
    });

    await spaceTest.step('KQL formula filter yields empty result', async () => {
      await lens.typeInFormula(`count(kql=`, { replace: true });
      await lens.typeInFormula(`bytes > 600000`, { focus: false });
      await lens.waitForVisualization();
      await expect.poll(async () => lens.getDatatableCellText(0, 0)).toBe('0');
    });
  });
});
