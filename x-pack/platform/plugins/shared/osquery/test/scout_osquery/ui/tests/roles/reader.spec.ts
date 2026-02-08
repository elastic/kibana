/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security';
import { test } from '../../fixtures';
import { readerRole } from '../../../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
  loadLiveQuery,
} from '../../../common/api_helpers';
import { waitForPageReady } from '../../../common/constants';

test.describe('Reader - only READ', { tag: ['@ess'] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;
  let packName: string;
  let packId: string;
  let liveQueryQuery: string;

  test.beforeAll(async ({ kbnClient }) => {
    const pack = await loadPack(kbnClient);
    packId = pack.saved_object_id;
    packName = pack.name;

    const sq = await loadSavedQuery(kbnClient);
    savedQueryId = sq.saved_object_id;
    savedQueryName = sq.id;

    const liveQuery = await loadLiveQuery(kbnClient);
    liveQueryQuery = liveQuery.queries?.[0].query || '';
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(readerRole);
  });

  test.afterAll(async ({ kbnClient }) => {
    if (savedQueryId) {
      await cleanupSavedQuery(kbnClient, savedQueryId);
    }

    if (packId) {
      await cleanupPack(kbnClient, packId);
    }
  });

  test('should not be able to add nor run saved queries', async ({ page, pageObjects }) => {
    await pageObjects.savedQueries.navigate();
    await expect(page.getByText(savedQueryName)).toBeVisible();
    await waitForPageReady(page);
    const addSavedQueryButton = page.getByRole('button', { name: 'Add saved query' });
    await expect(addSavedQueryButton).toBeVisible({ timeout: 30_000 });
    await expect(addSavedQueryButton).toBeDisabled();
    await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).not.toBeVisible();

    await pageObjects.savedQueries.clickEditSavedQuery(savedQueryName);
    await expect(page.locator('input[name="id"]')).toBeDisabled();
    await expect(page.locator('input[name="description"]')).toBeDisabled();
    await expect(page.getByText('Update query').first()).not.toBeVisible();
    await expect(page.getByText('Delete query').first()).not.toBeVisible();
  });

  test('should not be able to enter live queries with just read and no run saved queries', async ({
    page,
  }) => {
    await page.gotoApp('osquery/live_queries/new');
    await waitForPageReady(page);
    await expect(page.getByText('Permission denied').first()).toBeVisible();
  });

  test('should not be able to play in live queries history', async ({ page, pageObjects }) => {
    await pageObjects.liveQuery.navigate();
    await expect(page.getByText('New live query').first()).toBeDisabled();
    await expect(page.getByText(liveQueryQuery).first()).toBeVisible();
    await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).not.toBeVisible();
    await expect(page.locator('[aria-label="Details"]').first()).toBeVisible();
  });

  test('should not be able to add nor edit packs', async ({ page, pageObjects }) => {
    const packs = pageObjects.packs;
    await packs.navigate();
    await expect(page.testSubj.locator('add-pack-button')).toBeDisabled();

    // Ensure the pack is visible - it may be on page 2 due to accumulated packs from previous test runs
    let toggle = page.locator(`[aria-label="${packName}"]`);
    if ((await toggle.isVisible({ timeout: 3_000 }).catch(() => false)) === false) {
      // Click through pages to find the pack
      const nextPageLink = page.getByRole('link', { name: 'Next page' });
      while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await nextPageLink.click();
        await page.waitForTimeout(1000);
        if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
          break;
        }
      }
    }

    toggle = page.locator(`[aria-label="${packName}"]`);
    await toggle.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(toggle).toBeDisabled();

    await pageObjects.packs.clickPackByName(packName);
    await expect(page.getByText(`${packName} details`).first()).toBeVisible();
    await expect(page.getByText('Edit').first()).toBeDisabled();
    await expect(page.locator(`[aria-label="Run ${savedQueryId}"]`)).not.toBeVisible();
    await expect(page.locator(`[aria-label="Edit ${savedQueryId}"]`)).not.toBeVisible();
  });
});
