/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Migrated from: x-pack/platform/test/functional/apps/canvas/saved_object_resolve.ts
 *
 * Verifies the Canvas legacy-URL-alias redirect and conflict-resolution flows:
 *   1. Navigating to a workpad via an old alias ID triggers a redirect toast
 *      and the URL updates to the new workpad ID.
 *   2. Navigating to a workpad with a conflicting alias shows a "go to other" button,
 *      and clicking it navigates to the conflict-winner workpad.
 *
 * The spec operates inside a dedicated space (unique per worker) to avoid
 * collisions with other parallel tests.
 *
 * Auth: canvas:read is sufficient for viewing workpads.
 *
 * Note: `.euiGlobalToastList .euiToast .euiText` is a CSS selector for the
 * redirect toast — brittle but unavoidable until the Canvas redirect toast
 * gets a `data-test-subj` attribute.
 * TODO: add `data-test-subj` to the redirect toast in Canvas source.
 */

import { expect } from '@kbn/scout/ui';
import { test, testData } from '../fixtures';

test.describe('Canvas saved object resolve', { tag: testData.CANVAS_UI_TAGS }, () => {
  let spaceId: string;

  test.beforeAll(async ({ kbnClient, apiServices }, workerInfo) => {
    spaceId = `canvas-resolve-${workerInfo.parallelIndex}-${Date.now()}`;

    await apiServices.spaces.create({
      id: spaceId,
      name: spaceId,
      disabledFeatures: [],
    });

    await kbnClient.importExport.load(testData.KBN_ARCHIVES.SAVED_OBJECT_RESOLVE, {
      space: spaceId,
    });

    // Set up the alias-match redirect: old-id → new-id
    await kbnClient.savedObjects.create({
      type: 'legacy-url-alias',
      id: `${spaceId}:canvas-workpad:${testData.RESOLVE_OLD_ID}`,
      overwrite: true,
      attributes: {
        targetType: 'canvas-workpad',
        targetId: testData.RESOLVE_NEW_ID,
        targetNamespace: spaceId,
        sourceId: testData.RESOLVE_OLD_ID,
        purpose: 'savedObjectConversion',
      },
      references: [],
      migrationVersion: { 'legacy-url-alias': '8.2.0' },
    });

    // Set up the conflict redirect: conflict-old → conflict-new
    await kbnClient.savedObjects.create({
      type: 'legacy-url-alias',
      id: `${spaceId}:canvas-workpad:${testData.RESOLVE_CONFLICT_OLD_ID}`,
      overwrite: true,
      attributes: {
        targetType: 'canvas-workpad',
        targetId: testData.RESOLVE_CONFLICT_NEW_ID,
        targetNamespace: spaceId,
        sourceId: testData.RESOLVE_CONFLICT_OLD_ID,
        purpose: 'savedObjectConversion',
      },
      references: [],
      migrationVersion: { 'legacy-url-alias': '8.2.0' },
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await kbnClient.savedObjects.bulkDelete({
      objects: [
        {
          type: 'legacy-url-alias',
          id: `${spaceId}:canvas-workpad:${testData.RESOLVE_OLD_ID}`,
        },
        {
          type: 'legacy-url-alias',
          id: `${spaceId}:canvas-workpad:${testData.RESOLVE_CONFLICT_OLD_ID}`,
        },
      ],
    });
    await kbnClient.importExport.unload(testData.KBN_ARCHIVES.SAVED_OBJECT_RESOLVE, {
      space: spaceId,
    });
    await apiServices.spaces.delete(spaceId);
  });

  test('redirects an alias match to the new workpad URL', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await test.step('navigate to old workpad ID in the custom space', async () => {
      await canvas.gotoWorkpadInSpace(testData.RESOLVE_OLD_ID, spaceId, 1);
    });

    await test.step('redirect toast is shown with the new-location message', async () => {
      const toast = page.locator('.euiGlobalToastList .euiToast .euiText');
      await expect(toast).toContainText("The Workpad you're looking for has a new location.", {
        timeout: 20_000,
      });
    });

    await test.step('URL updates to the new workpad ID', async () => {
      await expect(page).toHaveURL(new RegExp(testData.RESOLVE_NEW_ID));
    });

    await test.step('workpad renders 4 elements', async () => {
      await expect(canvas.workpadPageElements).toHaveCount(4, { timeout: 30_000 });
    });
  });

  test('handles a conflict match via the "go to other" button', async ({
    page,
    pageObjects: { canvas },
  }) => {
    await test.step('navigate to conflict-old workpad ID in the custom space', async () => {
      await canvas.gotoWorkpadInSpace(testData.RESOLVE_CONFLICT_OLD_ID, spaceId, 1);
    });

    await test.step('click the "go to other" conflict button', async () => {
      await page.testSubj.locator('legacy-url-conflict-go-to-other-button').click();
    });

    await test.step('URL updates to the conflict-new workpad ID', async () => {
      await expect(page).toHaveURL(new RegExp(testData.RESOLVE_CONFLICT_NEW_ID));
    });

    await test.step('workpad renders 4 elements', async () => {
      await expect(canvas.workpadPageElements).toHaveCount(4, { timeout: 30_000 });
    });
  });
});
