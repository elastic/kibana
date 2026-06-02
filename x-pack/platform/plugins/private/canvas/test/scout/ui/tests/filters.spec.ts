/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/filters.ts
 *
 * Verifies that Canvas filter elements update the filter state when interacted with:
 *   1. Changing the dropdown filter value updates the term filter in the debug panel.
 *   2. Changing the date-range filter updates the range filter in the debug panel.
 *
 * The two scenarios are independent `test()` blocks; each re-opens the Filter Debug
 * Workpad in `beforeEach`, so they do not share browser state.
 *
 * The date-range scenario changes the range via the SuperDatePicker quick-menu ("Today")
 * and asserts only that the resulting range differs from the starting one (more robust than
 * asserting exact dates, which depend on "now").
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Canvas filters', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.FILTER);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_VIEWER_ROLE);
    await canvas.gotoWorkpad(testData.FILTER_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.FILTER);
  });

  test('filter updates when dropdown is changed', async ({ page, pageObjects: { canvas } }) => {
    await test.step('wait for 3 elements to load', async () => {
      await expect(canvas.workpadPageElements).toHaveCount(3);
    });

    await test.step('starting term filter value is "apm"', async () => {
      const startFilters = await canvas.getDebugFilters('term');
      expect(startFilters).toHaveLength(1);
      const projectQuery = startFilters[0].query.term.project;
      expect(projectQuery?.value).toBe('apm');
    });

    await test.step('change dropdown to "beats"', async () => {
      await page.testSubj.locator('canvasDropdownFilter__select').selectOption('beats');
    });

    await test.step('term filter value updates to "beats"', async () => {
      await expect
        .poll(async () => {
          const filters = await canvas.getDebugFilters('term');
          return filters[0]?.query?.term?.project?.value;
        })
        .toBe('beats');
    });
  });

  test('filter updates when time range is changed', async ({ page, pageObjects: { canvas } }) => {
    await test.step('wait for 3 elements to load', async () => {
      await expect(canvas.workpadPageElements).toHaveCount(3);
    });

    let initialGte: string;
    let initialLte: string;

    await test.step('capture starting range filter', async () => {
      const startFilters = await canvas.getDebugFilters('range');
      expect(startFilters).toHaveLength(1);
      const ts = startFilters[0].query.range['@timestamp'];
      initialGte = ts.gte as string;
      initialLte = ts.lte as string;
    });

    await test.step('change date range to Today', async () => {
      await page.testSubj.locator('superDatePickerToggleQuickMenuButton').click();
      await page.testSubj.locator('superDatePickerCommonlyUsed_Today').click();
    });

    await test.step('range filter gte/lte are updated', async () => {
      await expect
        .poll(async () => {
          const filters = await canvas.getDebugFilters('range');
          const ts = filters[0]?.query?.range?.['@timestamp'];
          if (!ts) return null;
          return { gte: ts.gte as string, lte: ts.lte as string };
        })
        .not.toStrictEqual({ gte: initialGte!, lte: initialLte! });
    });
  });
});
