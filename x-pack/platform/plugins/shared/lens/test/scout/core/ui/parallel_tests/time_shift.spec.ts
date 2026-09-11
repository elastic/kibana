/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../fixtures';

spaceTest.describe('Lens time shift', { tag: '@local-stateful-classic' }, () => {
  const suiteSetup = createLogstashLensEditorSuiteSetup();

  spaceTest.beforeAll(suiteSetup.beforeAll);

  spaceTest.beforeEach(suiteSetup.beforeEach);

  spaceTest.afterAll(suiteSetup.afterAll);

  // One journey: later steps mutate the same datatable (FTR time_shift.ts).
  // Exact cell/header strings are product behavior of time-shift + fix-action UX.
  spaceTest(
    'configures time-shifted metrics and applies terms fix actions',
    async ({ page, pageObjects }) => {
      spaceTest.setTimeout(120_000);
      const { lens } = pageObjects;

      await spaceTest.step('configure a shifted metric', async () => {
        await lens.switchToVisualization('lnsDatatable');
        // Empty datatable has no chart container yet — wait for dimension drop targets.
        await page.testSubj
          .locator('lnsDatatable_rows > lns-empty-dimension')
          .waitFor({ state: 'visible' });
        await lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'date_histogram',
          field: '@timestamp',
          disableEmptyRows: true,
        });
        await lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'median',
          field: 'bytes',
        });
        await lens.dimensions.openDimensionEditor('lnsDatatable_metrics > lns-dimensionTrigger');
        await lens.dimensions.enableTimeShift();
        await lens.dimensions.setTimeShift('6h');
        await lens.waitForVisualization();
        // toContainText retries until the shifted request lands (getCellText is a one-shot read).
        // EUI expand glyphs break exact toHaveText; substring match is enough.
        await expect(lens.datatable.getCellLocator(0, 1)).toContainText('5,994');
      });

      await spaceTest.step('add a regular metric beside the shifted one', async () => {
        await lens.closeDimensionEditor();
        await lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
        await lens.waitForVisualization();
        await expect(lens.datatable.getCellLocator(2, 1)).toContainText('5,994');
        await expect(lens.datatable.getCellLocator(2, 2)).toContainText('5,722.622');
      });

      await spaceTest.step('fix terms conflict with a filters conversion', async () => {
        // Seed terms into chart activeData before re-introducing the multi-shift conflict.
        // The Use-filters fix falls back to field-stats when activeData lacks terms; that
        // path 404s for `ip` in this Scout stack, while FTR still succeeds via field-stats.
        // Median is the first metric dimension (index 0) after Average was added beside it.
        await lens.dimensions.openDimensionEditor(
          'lnsDatatable_metrics > lns-dimensionTrigger',
          0,
          0
        );
        await lens.dimensions.enableTimeShift();
        await lens.dimensions.clearTimeShift();
        await lens.closeDimensionEditor();
        await expect(lens.datatable.getCellLocator(2, 2)).toContainText('5,722.622');

        await lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'ip',
        });
        await expect
          .poll(async () =>
            page.testSubj.locator('lnsDatatable_rows > lns-dimensionTrigger').count()
          )
          .toBeGreaterThan(0);

        // Re-apply the shift so terms + mixed shifts conflict again; activeData still has terms.
        await lens.dimensions.openDimensionEditor(
          'lnsDatatable_metrics > lns-dimensionTrigger',
          0,
          0
        );
        await lens.dimensions.enableTimeShift();
        await lens.dimensions.setTimeShift('6h');
        await lens.closeDimensionEditor();

        await expect(lens.dimensions.errorFixAction).toBeVisible();
        await lens.dimensions.useFixAction();
        // Cell values depend on which terms were pinned from activeData (field-stats
        // fallback 404s for `ip` here); assert conversion + numeric cells instead.
        // useFixAction already waits for the fix button to clear after the conversion.
        expect(await lens.datatable.getHeaderText(0)).toBe('Filters of ip');
        expect(Number((await lens.datatable.getCellText(2, 2)).replace(/,/g, ''))).toBeGreaterThan(
          0
        );
        expect(Number((await lens.datatable.getCellText(2, 3)).replace(/,/g, ''))).toBeGreaterThan(
          0
        );
      });

      await spaceTest.step('fix multi-terms conflict', async () => {
        await lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'ip',
          keepOpen: true,
        });
        // addTermToAgg waits for secondaryFields to commit (debounced) before return.
        await lens.dimensions.addTermToAgg('geo.src');
        await lens.closeDimensionEditor();
        await expect(lens.dimensions.errorFixAction).toBeVisible();
        await lens.dimensions.useFixAction();
        await lens.waitForVisualization();
        expect(await lens.datatable.getHeaderText(1)).toBe('Filters of ip › geo.src');
      });
    }
  );
});
