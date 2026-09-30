/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  A11Y_SELECTORS,
  WATCH_ID,
  WATCH_NAME,
  WATCHER_ADMIN_ROLE,
  WATCHER_TAGS,
} from '../fixtures/constants';

test.describe('Watcher — watch CRUD with accessibility', { tag: WATCHER_TAGS }, () => {
  test.afterAll(async ({ esClient }) => {
    // Safety-net: delete the test watch in case the test failed mid-journey.
    try {
      await esClient.watcher.deleteWatch({ id: WATCH_ID });
    } catch {
      // Watch was already deleted or never created — this is expected on a clean run.
    }
  });

  test('create, verify duplicate rejection, and delete a JSON watch', async ({
    browserAuth,
    esClient,
    page,
    pageObjects,
  }) => {
    // ES Watcher resources are global (not space-scoped). Clean any pre-existing
    // watches — including system watches from monitoring — before the test runs.
    await test.step('clean up pre-existing watches', async () => {
      try {
        const { watches } = await esClient.watcher.queryWatches();
        for (const { _id: watchId } of watches) {
          await esClient.watcher.deleteWatch({ id: watchId });
        }
      } catch {
        // The .watches index does not exist on a clean cluster — ignore.
      }
    });

    await browserAuth.loginWithCustomRole(WATCHER_ADMIN_ROLE);

    await test.step('watcher list page loads (empty state)', async () => {
      await pageObjects.watcher.goto();
      await expect(pageObjects.watcher.emptyPrompt).toBeVisible();
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('create JSON watch', async () => {
      await pageObjects.watcher.createJsonWatch(WATCH_ID, WATCH_NAME);
      const watch = await pageObjects.watcher.getWatch(WATCH_ID);
      expect(watch.id).toBe(WATCH_ID);
      expect(watch.name).toBe(WATCH_NAME);
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('reject duplicate watch ID with error callout', async () => {
      // Navigate back to the list, then attempt to create a watch with the same ID.
      await pageObjects.watcher.goto();
      await pageObjects.watcher.createWatchButton.click();
      await page.testSubj.click('jsonWatchCreateLink');
      await page.testSubj.locator('idInput').fill(WATCH_ID);
      await page.testSubj.locator('nameInput').fill('Duplicate');
      await page.testSubj.click('saveWatchButton');
      const errorCallout = pageObjects.watcher.errorCallout();
      await errorCallout.waitFor();
      await expect(errorCallout).toContainText(`There is already a watch with ID '${WATCH_ID}'`);
      const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(violations).toStrictEqual([]);
    });

    await test.step('delete watch via bulk selection', async () => {
      await pageObjects.watcher.goto();
      await pageObjects.watcher.selectAllWatches();
      await pageObjects.watcher.deleteSelectedWatches();

      // The delete confirmation modal renders in an EUI portal; wait for it
      // before the a11y check so the portal DOM is fully settled.
      const confirmButton = page.testSubj.locator('confirmModalConfirmButton');
      await confirmButton.waitFor();
      const { violations: confirmViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(confirmViolations).toStrictEqual([]);

      await confirmButton.click();
      await pageObjects.watcher.emptyPrompt.waitFor();
      const { violations: emptyListViolations } = await page.checkA11y({ include: A11Y_SELECTORS });
      expect(emptyListViolations).toStrictEqual([]);
    });
  });
});
