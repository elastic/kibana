/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadLiveQuery, loadCase, cleanupCase } from '../common/api_helpers';

test.describe('Add to Cases', { tag: [...tags.stateful.classic] }, () => {
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

  let caseId: string;
  let caseTitle: string;

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(socManagerRole);
  });

  test.afterEach(async ({ kbnClient }) => {
    if (caseId) {
      await cleanupCase(kbnClient, caseId);
    }
  });

  test(
    'should add result to a case without showing add to timeline button (observability)',
    { tag: [...tags.stateful.classic] },
    async ({ page, pageObjects, kbnUrl, kbnClient }) => {
      test.setTimeout(180_000);
      const caseData = await loadCase(kbnClient, 'observability');
      caseId = caseData.id;
      caseTitle = caseData.title;

      await test.step('Navigate to live query results page', async () => {
        await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));
        // Single-query rows auto-expand; wait for results table (agents can be slow)
        const start = Date.now();
        while (Date.now() - start < 90_000) {
          try {
            await page.testSubj
              .locator('osqueryResultsTable')
              .waitFor({ state: 'visible', timeout: 20_000 });
            break;
          } catch {
            await page.reload();
          }
        }

        await page.testSubj
          .locator('osqueryResultsTable')
          .waitFor({ state: 'visible', timeout: 30_000 });
      });

      await test.step('Add to Case and select case', async () => {
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        const addToCaseButton = page.testSubj.locator('addToCaseButton').first();
        await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
        await addToCaseButton.click();

        await expect(page.getByText('Select case')).toBeVisible();
        await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

        await expect(page.getByText(`Case ${caseTitle} updated`)).toBeVisible();
      });

      await test.step('Verify case content and action items', async () => {
        await page.getByRole('link', { name: 'View case' }).click();
        await expect(page.getByText(liveQueryQuery)).toBeVisible();

        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('viewInLens').first()).toBeVisible();
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('viewInDiscover').first()).toBeVisible();
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('addToCaseButton').first()).not.toBeVisible();
        await expect(page.getByText('Add to Timeline investigation')).not.toBeVisible();
      });
    }
  );

  test(
    'should add result to a case without showing add to timeline button (security)',
    { tag: [...tags.serverless.security.complete] },
    async ({ page, pageObjects, kbnUrl, kbnClient }) => {
      test.setTimeout(180_000);

      const caseData = await loadCase(kbnClient, 'securitySolution');
      caseId = caseData.id;
      caseTitle = caseData.title;

      await test.step('Navigate to live query results page', async () => {
        await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));

        const start = Date.now();
        while (Date.now() - start < 120_000) {
          try {
            await page.testSubj
              .locator('osqueryResultsTable')
              .waitFor({ state: 'visible', timeout: 15_000 });
            break;
          } catch {
            await page.reload();
          }
        }

        await page.testSubj
          .locator('osqueryResultsTable')
          .waitFor({ state: 'visible', timeout: 30_000 });
      });

      await test.step('Add to Case and select case', async () => {
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        const addToCaseButton = page.testSubj.locator('addToCaseButton').first();
        await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
        await addToCaseButton.click();

        await expect(page.getByText('Select case')).toBeVisible();
        await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

        await expect(page.getByText(`Case ${caseTitle} updated`)).toBeVisible();
      });

      await test.step('Verify case content and action items', async () => {
        await page.getByRole('link', { name: 'View case' }).click();
        await expect(page.getByText('SELECT * FROM os_version;')).toBeVisible();

        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('viewInLens').first()).toBeVisible();
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('viewInDiscover').first()).toBeVisible();
        // eslint-disable-next-line playwright/no-nth-methods -- first visible result
        await expect(page.testSubj.locator('addToCaseButton').first()).not.toBeVisible();
        await expect(page.getByText('Add to Timeline investigation')).not.toBeVisible();
      });
    }
  );
});
