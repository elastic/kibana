/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { readerRole } from '../../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
  loadLiveQuery,
} from '../../common/api_helpers';

test.describe('Reader - only READ', { tag: [...tags.stateful.classic] }, () => {
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
    await pageObjects.packs.ensureAllPacksVisible();
    await expect(page.getByText(savedQueryName)).toBeVisible({ timeout: 15_000 });
    const addSavedQueryButton = page.getByText('Add saved query');
    await expect(addSavedQueryButton).toBeVisible({ timeout: 30_000 });
    await expect(addSavedQueryButton).toBeDisabled();
    await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).toBeDisabled();

    await pageObjects.savedQueries.clickEditSavedQuery(savedQueryName);
    await expect(page.locator('input[name="id"]')).toBeDisabled();
    await expect(page.locator('input[name="description"]')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Update query' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete query' })).not.toBeVisible();
  });

  test('should not be able to enter live queries with just read and no run saved queries', async ({
    page,
  }) => {
    await page.gotoApp('osquery/live_queries/new');
    await expect(page.getByText('Permission denied')).toBeVisible();
  });

  test('should not be able to play in live queries history', async ({ page, pageObjects }) => {
    await pageObjects.liveQuery.navigate();
    await expect(page.testSubj.locator('newLiveQueryButton')).toBeDisabled();
    // eslint-disable-next-line playwright/no-nth-methods -- multiple rows may contain the same query text
    await expect(page.getByText(liveQueryQuery).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).not.toBeVisible();
    await expect(page.getByLabel('Details').first()).toBeVisible();
  });

  test('should not be able to add nor edit packs', async ({ page, pageObjects }) => {
    const packs = pageObjects.packs;
    await packs.navigate();
    await expect(page.testSubj.locator('add-pack-button')).toBeDisabled();
    await packs.ensureAllPacksVisible();

    const toggle = page.locator(`[aria-label="${packName}"]`);
    await toggle.scrollIntoViewIfNeeded().catch(() => {});
    await toggle.waitFor({ state: 'visible', timeout: 30_000 });
    await expect(toggle).toBeDisabled();

    await pageObjects.packs.navigateToPackDetail(packId);
    await expect(page.getByText(`${packName} details`)).toBeVisible();
    await expect(page.testSubj.locator('edit-pack-button')).toBeDisabled();
    await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).not.toBeVisible();
    await expect(page.locator(`[aria-label="Edit ${savedQueryName}"]`)).not.toBeVisible();
  });
});
