/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../../fixtures';
import { t1AnalystRole, t2AnalystRole } from '../../../common/roles';
import {
  loadPack,
  cleanupPack,
  loadSavedQuery,
  cleanupSavedQuery,
  loadLiveQuery,
} from '../../../common/api_helpers';
import { waitForPageReady } from '../../../common/constants';

const roles = [
  { name: 't1_analyst', role: t1AnalystRole },
  { name: 't2_analyst', role: t2AnalystRole },
];

roles.forEach(({ name, role }) => {
  test.describe(`T1 and T2 analysts - ${name}`, { tag: ['@ess', '@svlSecurity'] }, () => {
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
      });
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
      await expect(page.getByText(savedQueryName)).toBeVisible();
      await waitForPageReady(page);
      const addSavedQueryButton = page.getByRole('button', { name: 'Add saved query' });
      await expect(addSavedQueryButton).toBeVisible({ timeout: 30_000 });
      await expect(addSavedQueryButton).toBeDisabled();
      await expect(page.locator(`[aria-label="Run ${savedQueryName}"]`)).toBeEnabled();

      await pageObjects.savedQueries.clickRunSavedQuery(savedQueryName);
      await pageObjects.liveQuery.selectAllAgents();
      await expect(page.getByText('select * from uptime;').first()).toBeVisible();
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();

      // Check action items - wait for results actions to load
      // Note: t1/t2 analysts don't have Lens permissions, so "View in Lens" should not be visible
      await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('View in Lens').first()).not.toBeVisible();
      await expect(page.getByText('Add to Timeline investigation').first()).not.toBeVisible();
    });

    test('should be able to play in live queries history', async ({ page, pageObjects }) => {
      await pageObjects.liveQuery.navigate();
      await expect(page.getByText('New live query').first()).toBeEnabled();
      await expect(page.getByText(liveQueryQuery).first()).toBeVisible();

      const runQueryButton = page.locator('[aria-label="Run query"]').first();
      await expect(runQueryButton).toBeEnabled();
      await runQueryButton.click();

      await waitForPageReady(page);
      await expect(
        page.testSubj.locator('savedQuerySelect').locator('[data-test-subj="comboBoxSearchInput"]')
      ).toHaveValue(savedQueryName, { timeout: 30_000 });
      await pageObjects.liveQuery.submitQuery();
      await pageObjects.liveQuery.checkResults();
    });

    test('should be able to use saved query in a new query', async ({ page, pageObjects }) => {
      await pageObjects.liveQuery.navigate();
      const newLiveQueryButton = page.getByText('New live query').first();
      await expect(newLiveQueryButton).toBeEnabled();
      await newLiveQueryButton.click();

      await pageObjects.liveQuery.selectAllAgents();
      const savedQueryCombo = page.testSubj
        .locator('savedQuerySelect')
        .locator('[data-test-subj="comboBoxInput"]');
      await savedQueryCombo.click();
      await savedQueryCombo.pressSequentially(savedQueryName);
      await page
        .getByRole('option', { name: new RegExp(savedQueryName, 'i') })
        .first()
        .click();
      await expect(page.getByText('select * from uptime').first()).toBeVisible();
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

    test('should not be able to create new liveQuery from scratch', async ({
      page,
      pageObjects,
    }) => {
      await page.gotoApp('osquery');
      await waitForPageReady(page);
      await page.getByText('New live query').first().click();
      await waitForPageReady(page);
      await pageObjects.liveQuery.selectAllAgents();
      await expect(page.testSubj.locator('kibanaCodeEditor')).not.toBeVisible();
      await pageObjects.liveQuery.submitQuery();
      await expect(page.getByText('Query is a required field').first()).toBeVisible();
    });
  });
});
