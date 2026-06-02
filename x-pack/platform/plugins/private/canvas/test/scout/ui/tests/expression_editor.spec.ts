/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/expression.ts
 *
 * Verifies the Canvas expression editor:
 *   1. Editing an element via the sidebar Monaco editor syncs the change to
 *      the full-screen expression editor.
 *   2. No autocomplete is shown when the expression editor is open but idle.
 *   3. Autocomplete suggestions appear when the user types a space.
 *
 * All three FTR `it` blocks are merged into a single `test()` using `test.step`
 * because they share browser state (the expression editor must be open from step 1
 * for steps 2 and 3 to have any context to check).
 *
 * Auth: canvas:all is required (editing a workpad).
 *
 * Note: `.monaco-list-rows > .monaco-list-row` is a Monaco-internal CSS selector
 * for autocomplete suggestion rows — brittle but unavoidable.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Canvas expression editor', { tag: testData.CANVAS_UI_TAGS }, () => {
  test.beforeAll(async ({ kbnClient, esArchiver }) => {
    await esArchiver.loadIfNeeded(testData.ES_ARCHIVES.LOGSTASH);
    await kbnClient.importExport.load(testData.KBN_ARCHIVES.DEFAULT);
  });

  test.beforeEach(async ({ browserAuth, pageObjects: { canvas } }) => {
    await browserAuth.loginWithCustomRole(testData.CANVAS_EDITOR_ROLE);
    await canvas.gotoWorkpad(testData.TEST_WORKPAD_ID);
    await expect(canvas.workpadPage).toBeVisible();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects.cleanStandardList();
  });

  test('sidebar Monaco editor syncs to expression editor; autocomplete works', async ({
    page,
    pageObjects: { canvas },
  }) => {
    // ── Step 1: wait for workpad to render all 4 elements ─────────────────
    await test.step('workpad renders 4 elements', async () => {
      await expect(canvas.workpadPageElements).toHaveCount(4);
    });

    // ── Step 2: click the first element (markdown) and open the expression editor ──
    let originalMd = '';

    await test.step('click first element and open expression editor', async () => {
      // eslint-disable-next-line playwright/no-nth-methods
      await canvas.workpadPageElements.first().click();
      await canvas.waitForCodeEditorReady('canvasCodeEditorField');
      await canvas.openExpressionEditor();
      await canvas.waitForCodeEditorReady('canvasExpressionInput');
    });

    await test.step('sidebar edit syncs to expression editor', async () => {
      originalMd = await canvas.getCodeEditorValue(0);
      const newMd = `${originalMd} and this is a test`;

      await canvas.setCodeEditorValue('', 0);
      await canvas.setCodeEditorValue(newMd, 0);

      // The expression editor (index 1) should reflect the updated markdown
      await expect
        .poll(async () => canvas.getCodeEditorValue(1))
        .toContain('Orange: Timelion, Server function and this is a test');

      // Reset to original value for subsequent steps
      await canvas.setCodeEditorValue(originalMd, 0);
    });

    // ── Step 3: no autocomplete when the expression editor is idle ─────────
    await test.step('no autocomplete suggestions before typing', async () => {
      const suggestions = page.locator('.monaco-list-rows > .monaco-list-row');
      await expect(suggestions).toHaveCount(0);
    });

    // ── Step 4: autocomplete appears after typing a space ──────────────────
    await test.step('autocomplete suggestions appear after pressing Space', async () => {
      const currentExpr = await canvas.getCodeEditorValue(1);

      // Add a trailing space to the expression to trigger autocomplete
      await canvas.setCodeEditorValue(' ', 1);

      const suggestions = page.locator('.monaco-list-rows > .monaco-list-row');
      await expect(suggestions).toHaveCount(0); // still zero until user presses a key

      // Click the expression input, then press Space to trigger the suggestion widget
      await page.testSubj.locator('canvasExpressionInput').click();
      await page.keyboard.press('Space');

      await expect(suggestions).not.toHaveCount(0);

      // Reset expression
      await canvas.setCodeEditorValue(currentExpr, 1);
    });
  });
});
