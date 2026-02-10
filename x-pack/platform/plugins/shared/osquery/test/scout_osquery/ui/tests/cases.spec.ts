/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { expect } from '@kbn/scout';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadLiveQuery, loadCase, cleanupCase } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe('Add to Cases', () => {
  // Case tests involve live query results and case creation which can be slow
  test.describe.configure({ timeout: 300_000 });

  let liveQueryId: string;
  let liveQueryQuery: string;

  test.beforeAll(async ({ kbnClient }) => {
    const liveQuery = await loadLiveQuery(kbnClient, {
      agent_all: true,
      query: 'SELECT * FROM os_version;',
      kuery: '',
    });
    liveQueryId = liveQuery.action_id;
    liveQueryQuery = liveQuery.queries?.[0].query || 'SELECT * FROM os_version;';
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('observability', { tag: ['@ess'] }, () => {
    let caseId: string;
    let caseTitle: string;

    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      const caseData = await loadCase(kbnClient, 'observability');
      caseId = caseData.id;
      caseTitle = caseData.title;
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test.afterEach(async ({ kbnClient }) => {
      if (caseId) {
        await cleanupCase(kbnClient, caseId);
      }
    });

    test('should add result to a case without showing add to timeline button', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      // Navigate to live query results page
      await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));
      await waitForPageReady(page);
      await page.testSubj
        .locator('osqueryResultsTable')
        .waitFor({ state: 'visible', timeout: 60_000 });

      // Find and click "Add to Case" button
      const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
      await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
      await addToCaseButton.click();

      // Select the case
      await expect(page.getByText('Select case').first()).toBeVisible();
      await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

      await expect(page.getByText(`Case ${caseTitle} updated`).first()).toBeVisible();

      // View case and check results
      await page.getByText('View case').first().click();
      await expect(page.getByText(liveQueryQuery).first()).toBeVisible();

      // Check action items - should not have timeline
      await expect(page.getByText('View in Lens').first()).toBeVisible();
      await expect(page.getByText('View in Discover').first()).toBeVisible();
      await expect(page.getByText('Add to Case').first()).not.toBeVisible();
      await expect(page.getByText('Add to Timeline investigation').first()).not.toBeVisible();
    });
  });

  // eslint-disable-next-line playwright/max-nested-describe
  test.describe('security', { tag: ['@ess', '@svlSecurity'] }, () => {
    let caseId: string;
    let caseTitle: string;

    // Live query result verification can be slow in serverless mode
    test.describe.configure({ timeout: 300_000 });

    test.beforeEach(async ({ browserAuth, kbnClient }) => {
      const caseData = await loadCase(kbnClient, 'securitySolution');
      caseId = caseData.id;
      caseTitle = caseData.title;
      await browserAuth.loginWithCustomRole(socManagerRole);
    });

    test.afterEach(async ({ kbnClient }) => {
      if (caseId) {
        await cleanupCase(kbnClient, caseId);
      }
    });

    test('should add result to a case without showing add to timeline button', async ({
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000); // Live query results can take time in serverless

      // Navigate to live query results page with retry
      await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));
      await waitForPageReady(page);

      // Results may not be ready yet - reload periodically until they appear
      const start = Date.now();
      while (Date.now() - start < 120_000) {
        try {
          await page.testSubj
            .locator('osqueryResultsTable')
            .waitFor({ state: 'visible', timeout: 15_000 });
          break;
        } catch {
          await page.reload();
          await waitForPageReady(page);
        }
      }
      await page.testSubj
        .locator('osqueryResultsTable')
        .waitFor({ state: 'visible', timeout: 30_000 });

      // Find and click "Add to Case" button
      const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
      await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
      await addToCaseButton.click();

      // Select the case
      await expect(page.getByText('Select case').first()).toBeVisible();
      await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

      await expect(page.getByText(`Case ${caseTitle} updated`).first()).toBeVisible();

      // View case and check results
      await page.getByText('View case').first().click();
      await expect(page.getByText('SELECT * FROM os_version;').first()).toBeVisible();

      // Check action items - should not have timeline
      await expect(page.getByText('View in Lens').first()).toBeVisible();
      await expect(page.getByText('View in Discover').first()).toBeVisible();
      await expect(page.getByText('Add to Case').first()).not.toBeVisible();
      await expect(page.getByText('Add to Timeline investigation').first()).not.toBeVisible();
    });
  });
});
