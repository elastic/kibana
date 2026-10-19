/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { createLogstashLensEditorSuiteSetup, spaceTest } from '../../fixtures';

spaceTest.describe(
  'Lens table with the TanStack grid',
  // Local-only: forcing the feature flag via `apiServices.core.settings` needs the
  // `/internal/core/_settings` route, which exists only when `coreApp.allowDynamicConfigOverrides`
  // is enabled (local Scout servers). The override is server-wide, so this runs in the sequential config.
  { tag: '@local-stateful-classic' },
  () => {
    const suiteSetup = createLogstashLensEditorSuiteSetup();

    spaceTest.beforeAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { 'lens.enableTanstackDatatable': true },
      });
      await suiteSetup.beforeAll({ apiServices, scoutSpace });
    });

    spaceTest.beforeEach(suiteSetup.beforeEach);

    spaceTest.afterAll(async ({ apiServices, scoutSpace }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { 'lens.enableTanstackDatatable': null },
      });
      await suiteSetup.afterAll({ apiServices, scoutSpace });
    });

    spaceTest('renders, sorts, navigates and expands cells', async ({ page, pageObjects }) => {
      spaceTest.setTimeout(120_000);
      const { lens } = pageObjects;
      const grid = page.testSubj.locator('lnsDataTable');

      await spaceTest.step('build a table of the top ips with the average of bytes', async () => {
        await lens.switchToVisualization('lnsDatatable');
        await lens.configureDimension({
          dimension: 'lnsDatatable_rows > lns-empty-dimension',
          operation: 'terms',
          field: 'ip',
          keepOpen: true,
        });
        await lens.dimensions.setTermsNumberOfValues(5);
        await lens.closeDimensionEditor();
        await lens.configureDimension({
          dimension: 'lnsDatatable_metrics > lns-empty-dimension',
          operation: 'average',
          field: 'bytes',
        });
      });

      await spaceTest.step('is rendered by the TanStack grid', async () => {
        await expect(grid.getByRole('grid')).toBeVisible();
        // Five terms and the Other bucket, in two columns.
        await expect(grid.getByTestId('lnsTanStackGridCellContent')).toHaveCount(12);
        // The row number column has a header too.
        await expect(grid.getByRole('columnheader')).toHaveCount(3);
        await expect.poll(() => lens.datatable.getCountOfColumns()).toBe(2);
        await expect(lens.datatable.getCellLocator(0, 0)).not.toBeEmpty();
      });

      await spaceTest.step('sorts from the header menu', async () => {
        const header = lens.datatable.getHeaderLocator('Average of bytes');
        await header.hover();
        await header.getByRole('button', { name: /Column actions/ }).click();
        await page.testSubj.locator('dataGridHeaderCellActionSortDesc').click();
        await expect(header).toHaveAttribute('aria-sort', 'descending');
      });

      await spaceTest.step('moves between cells with the arrow keys', async () => {
        await lens.datatable.getCellLocator(0, 0).focus();
        await page.keyboard.press('ArrowRight');
        await expect(lens.datatable.getCellLocator(0, 1)).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(lens.datatable.getCellLocator(1, 1)).toBeFocused();
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        await expect(lens.datatable.getHeaderLocator('Average of bytes')).toBeFocused();
      });

      await spaceTest.step('expands a cell with Enter and closes it with Escape', async () => {
        await lens.datatable.getCellLocator(0, 0).focus();
        await page.keyboard.press('Enter');
        await expect(page.testSubj.locator('euiDataGridExpansionPopover')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.testSubj.locator('euiDataGridExpansionPopover')).toBeHidden();
        await expect(lens.datatable.getCellLocator(0, 0)).toBeFocused();
      });

      await spaceTest.step('resizes a column with the keyboard and resets its width', async () => {
        const header = lens.datatable.getHeaderLocator('Average of bytes');
        await header.focus();
        await page.keyboard.press('Alt+ArrowRight');
        await header.getByRole('button', { name: /Column actions/ }).click();
        await expect(page.testSubj.locator('lensDatatableResetWidth')).toBeEnabled();
      });
    });
  }
);
