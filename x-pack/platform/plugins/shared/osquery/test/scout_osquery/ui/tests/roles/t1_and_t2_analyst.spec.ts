/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../fixtures';
import { t1AnalystRole, t2AnalystRole } from '../../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
  loadLiveQuery,
} from '../../common/api_helpers';
import { waitForPageReady } from '../../common/constants';

const roles = [
  { name: 't1_analyst', role: t1AnalystRole },
  { name: 't2_analyst', role: t2AnalystRole },
];

roles.forEach(({ name, role }) => {
  test.describe(
    `T1 and T2 analysts - ${name}`,
    { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
    () => {
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

        const liveQuery = await loadLiveQuery(kbnClient, {
          agent_all: true,
          query: 'select * from uptime;',
          saved_query_id: savedQueryName,
          kuery: '',
        } as any);
        liveQueryQuery = liveQuery.queries?.[0].query || '';
      });

      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginWithCustomRole(role);
      });

      test.afterAll(async ({ kbnClient }) => {
        if (savedQueryId) {
          await cleanupSavedQuery(kbnClient, savedQueryId);
        }

        if (packId) {
          await cleanupPack(kbnClient, packId);
        }
      });

      test('should be able to run saved queries but not add new ones', async ({
        page,
        pageObjects,
      }) => {
        await pageObjects.savedQueries.navigate();
        await waitForPageReady(page);
        // Saved query may be on another page - paginate to find it
        const savedQueryRow = page.getByText(savedQueryName);
        if ((await savedQueryRow.isVisible({ timeout: 3_000 }).catch(() => false)) === false) {
          const nextPageLink = page.getByRole('link', { name: 'Next page' });
          while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await nextPageLink.click();
            await new Promise((r) => setTimeout(r, 1_000));
            if (await savedQueryRow.isVisible({ timeout: 2_000 }).catch(() => false)) {
              break;
            }
          }
        }

        await expect(page.getByText(savedQueryName)).toBeVisible({ timeout: 10_000 });
        const addSavedQueryButton = page.getByRole('button', { name: 'Add saved query' });
        await expect(addSavedQueryButton).toBeVisible({ timeout: 30_000 });
        await expect(addSavedQueryButton).toBeDisabled();
        await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).toBeEnabled();

        await pageObjects.savedQueries.clickRunSavedQuery(savedQueryName);
        await pageObjects.liveQuery.selectAllAgents();
        await expect(page.getByText('select * from uptime;')).toBeVisible();
        await pageObjects.liveQuery.submitQuery();
        await pageObjects.liveQuery.checkResults();

        // Check action items - wait for results actions to load
        // Note: t1/t2 analysts don't have Lens permissions, so "View in Lens" should not be visible
        // eslint-disable-next-line playwright/no-nth-methods -- single saved query; only one result section
        await expect(page.testSubj.locator('viewInDiscover').first()).toBeVisible({
          timeout: 30_000,
        });
        // eslint-disable-next-line playwright/no-nth-methods -- single saved query; only one result section
        await expect(page.testSubj.locator('addToCaseButton').first()).toBeVisible({
          timeout: 30_000,
        });
        // eslint-disable-next-line playwright/no-nth-methods -- single saved query; only one result section
        await expect(page.testSubj.locator('viewInLens').first()).not.toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Add to Timeline investigation' })
        ).not.toBeVisible();
      });

      test('should be able to play in live queries history', async ({ page, pageObjects }) => {
        await pageObjects.liveQuery.navigate();
        await expect(page.testSubj.locator('newLiveQueryButton')).toBeEnabled();
        await expect(page.getByText(liveQueryQuery)).toBeVisible();

        // Scope to row containing the saved query - multiple rows have Run buttons
        const savedQueryRow = page.locator('tbody tr').filter({ hasText: liveQueryQuery });
        const runQueryButton = savedQueryRow.getByRole('button', { name: 'Run query' });
        await expect(runQueryButton).toBeEnabled();
        await runQueryButton.click();

        await waitForPageReady(page);
        await expect(
          page.testSubj
            .locator('savedQuerySelect')
            .locator('[data-test-subj="comboBoxSearchInput"]')
        ).toHaveValue(savedQueryName, { timeout: 30_000 });
        await pageObjects.liveQuery.submitQuery();
        await pageObjects.liveQuery.checkResults();
      });

      test('should be able to use saved query in a new query', async ({ page, pageObjects }) => {
        await pageObjects.liveQuery.navigate();
        const newLiveQueryButton = page.testSubj.locator('newLiveQueryButton');
        await expect(newLiveQueryButton).toBeEnabled();
        await newLiveQueryButton.click();

        await pageObjects.liveQuery.selectAllAgents();
        const savedQuerySelect = page.testSubj.locator('savedQuerySelect');
        await savedQuerySelect.locator('[data-test-subj="comboBoxInput"]').click();
        const searchInput = savedQuerySelect.locator('[data-test-subj="comboBoxSearchInput"]');
        await searchInput.waitFor({ state: 'visible', timeout: 10_000 });
        await searchInput.fill('');
        await searchInput.pressSequentially(savedQueryName);
        await page.getByRole('option', { name: new RegExp(savedQueryName, 'i') }).click();
        await expect(page.getByText('select * from uptime')).toBeVisible();
        await pageObjects.liveQuery.submitQuery();
        await pageObjects.liveQuery.checkResults();
      });

      test('should not be able to add nor edit packs', async ({ page, pageObjects }) => {
        await pageObjects.packs.navigate();
        await expect(page.testSubj.locator('add-pack-button')).toBeDisabled();

        // Ensure the pack is visible - it may be on page 2 due to accumulated packs
        let toggle = page.locator(`[aria-label="${packName}"]`);
        if ((await toggle.isVisible({ timeout: 3_000 }).catch(() => false)) === false) {
          const nextPageLink = page.getByRole('link', { name: 'Next page' });
          while (await nextPageLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await nextPageLink.click();
            await waitForPageReady(page);
            if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
              break;
            }
          }
        }

        toggle = page.locator(`[aria-label="${packName}"]`);
        await toggle.waitFor({ state: 'visible', timeout: 10_000 });
        await expect(toggle).toBeDisabled();

        await pageObjects.packs.navigateToPackDetail(packId);
        await expect(page.getByText(`${packName} details`)).toBeVisible();
        await expect(page.getByRole('button', { name: 'Edit' })).toBeDisabled();
        await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).not.toBeVisible();
        await expect(page.locator(`[aria-label="Edit ${savedQueryName}"]`)).not.toBeVisible();
      });

      test('should not be able to create new liveQuery from scratch', async ({
        page,
        pageObjects,
      }) => {
        await page.gotoApp('osquery');
        await waitForPageReady(page);
        await page.testSubj.locator('newLiveQueryButton').click();
        await waitForPageReady(page);
        await pageObjects.liveQuery.selectAllAgents();
        await expect(page.testSubj.locator('kibanaCodeEditor')).toHaveCount(0);
        await pageObjects.liveQuery.clickSubmit();
        await expect(page.getByText('Query is a required field')).toBeVisible();
      });
    }
  );
});
