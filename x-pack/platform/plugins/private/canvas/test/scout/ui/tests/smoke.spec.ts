/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/smoke_test.ts
 *
 * Verifies the core Canvas expression render pipeline in the browser:
 *   1. Workpad listing loads and shows exactly one item: "Test Workpad".
 *   2. Clicking the workpad opens it and updates the URL to the workpad ID.
 *   3. Four rendered elements are visible (markdown + 3 datatables: essql/csv/timelion)
 *      with the expected row counts, confirming the expression pipeline ran.
 *
 * Note on element content selectors: `.canvasMarkdown` and `.canvasDataTable` are CSS
 * class selectors on rendered expression output — they're brittle but unavoidable until
 * the Canvas renderer adds `data-test-subj` attributes to the output components.
 * TODO: add `data-test-subj` to canvasMarkdown and canvasDataTable render components
 * so these assertions can migrate to testSubj-based locators.
 *
 * Auth: canvas:read is sufficient for viewing workpads (uses CANVAS_VIEWER_ROLE).
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test, testData } from '../fixtures';

test.describe('Canvas smoke test', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_VIEWER_ROLE);
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('loads workpad list, opens workpad, and renders 4 elements', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await test.step('workpad listing shows exactly one row: "Test Workpad"', async () => {
      await canvas.gotoListing();
      await expect(canvas.workpadListItems).toHaveCount(1);
      await expect(canvas.workpadListItems).toContainText(testData.TEST_WORKPAD_NAME);
    });

    await test.step('open "Test Workpad" by clicking the sole listing row', async () => {
      await canvas.openSoleWorkpad();
      await expect(canvas.workpadPage).toBeVisible();
    });

    await test.step('URL contains the workpad ID and workpad renders exactly 4 elements', async () => {
      await expect(page).toHaveURL(new RegExp(testData.TEST_WORKPAD_ID));
      await expect(canvas.workpadPageElements).toHaveCount(4);
    });

    // Canvas expression rendering is async (ESSQL/timelion queries hit Elasticsearch).
    // Give each content assertion 30 s so transient slow queries don't cause flakiness.
    const RENDER_TIMEOUT = 30_000;

    await test.step('one element is a visible markdown containing "Welcome to Canvas"', async () => {
      // Distinguish by CSS class since expression output has no data-test-subj yet.
      // Use locator.filter() instead of positional selectors to avoid fragile :nth-child counts.
      const markdownContainer = canvas.workpadPageElements.filter({
        has: page.locator('.canvasMarkdown'),
      });
      await expect(markdownContainer).toHaveCount(1, { timeout: RENDER_TIMEOUT });
      await expect(markdownContainer.locator('.canvasMarkdown')).toContainText(
        'Welcome to Canvas',
        {
          timeout: RENDER_TIMEOUT,
        }
      );
    });

    await test.step('three datatable elements are rendered (essql, csv, timelion)', async () => {
      const datatableContainers = canvas.workpadPageElements.filter({
        has: page.locator('.canvasDataTable'),
      });
      await expect(datatableContainers).toHaveCount(3, { timeout: RENDER_TIMEOUT });
    });

    await test.step('total datatable row count is 24 (essql:10 + csv:2 + timelion:12)', async () => {
      // Without data-test-subj on individual element containers we cannot reliably
      // isolate per-datatable rows using positional CSS selectors.  Asserting the
      // aggregate row count still validates that all three expressions executed and
      // returned the expected number of results.
      // TODO: add data-test-subj to canvasDataTable containers so per-datatable
      // row counts can be asserted independently.
      const allRows = page.locator(
        '[data-test-subj="canvasWorkpadPage"] [data-test-subj="canvasWorkpadPageElementContent"] .canvasDataTable tbody tr'
      );
      await expect(allRows).toHaveCount(24, { timeout: RENDER_TIMEOUT });
    });
  });
});
