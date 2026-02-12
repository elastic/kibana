/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable playwright/no-nth-methods */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { socManagerRole } from '../common/roles';
import { loadLiveQuery, loadCase, cleanupCase } from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

test.describe(
  'Add to Cases',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
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
    test.describe('observability', { tag: [...tags.stateful.classic] }, () => {
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
        await test.step('Navigate to live query results page', async () => {
          await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));
          await waitForPageReady(page);
          await page.testSubj
            .locator('osqueryResultsTable')
            .waitFor({ state: 'visible', timeout: 60_000 });
        });

        await test.step('Add to Case and select case', async () => {
          const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
          await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
          await addToCaseButton.click();

          await expect(page.getByText('Select case').first()).toBeVisible();
          await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

          await expect(page.getByText(`Case ${caseTitle} updated`).first()).toBeVisible();
        });

        await test.step('Verify case content and action items', async () => {
          await page.getByText('View case').first().click();
          await expect(page.getByText(liveQueryQuery).first()).toBeVisible();

          await expect(page.getByText('View in Lens').first()).toBeVisible();
          await expect(page.getByText('View in Discover').first()).toBeVisible();
          await expect(page.getByText('Add to Case').first()).not.toBeVisible();
          await expect(page.getByText('Add to Timeline investigation').first()).not.toBeVisible();
        });
      });
    });

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe(
      'security',
      { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
      () => {
        let caseId: string;
        let caseTitle: string;

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

          await test.step('Navigate to live query results page', async () => {
            await page.goto(kbnUrl.get(`/app/osquery/live_queries/${liveQueryId}`));
            await waitForPageReady(page);

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
          });

          await test.step('Add to Case and select case', async () => {
            const addToCaseButton = page.locator('[aria-label="Add to Case"]').first();
            await addToCaseButton.waitFor({ state: 'visible', timeout: 30_000 });
            await addToCaseButton.click();

            await expect(page.getByText('Select case').first()).toBeVisible();
            await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

            await expect(page.getByText(`Case ${caseTitle} updated`).first()).toBeVisible();
          });

          await test.step('Verify case content and action items', async () => {
            await page.getByText('View case').first().click();
            await expect(page.getByText('SELECT * FROM os_version;').first()).toBeVisible();

            await expect(page.getByText('View in Lens').first()).toBeVisible();
            await expect(page.getByText('View in Discover').first()).toBeVisible();
            await expect(page.getByText('Add to Case').first()).not.toBeVisible();
            await expect(page.getByText('Add to Timeline investigation').first()).not.toBeVisible();
          });
        });
      }
    );
  }
);
