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
import { loadRule, cleanupRule } from '../common/api_helpers';
import { waitForAlerts } from '../common/constants';

const UUID_REGEX = '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}';

test.describe(
  'Alert Flyout Automated Action Results',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;

    test.beforeAll(async ({ kbnClient }) => {
      const rule = await loadRule(kbnClient, true); // true for response actions
      ruleId = rule.id;
    });

    test.beforeEach(async ({ browserAuth, page, kbnUrl, kbnClient }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
      await waitForAlerts(page, kbnClient, ruleId);
    });

    test.afterAll(async ({ kbnClient }) => {
      if (ruleId) {
        await cleanupRule(kbnClient, ruleId);
      }
    });

    test(
      'can visit discover from response action results',
      { tag: [...tags.stateful.classic] },
      async ({ page }) => {
        test.setTimeout(180_000);
        const discoverRegex = new RegExp(`action_id: ${UUID_REGEX}`);

        await test.step('Expand alert and open response action results', async () => {
          // eslint-disable-next-line playwright/no-nth-methods -- first alert row
          await page.testSubj.locator('expand-event').first().click();
          await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
          await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
          const responseWrapper = page.testSubj.locator('responseActionsViewWrapper');
          await expect(responseWrapper).toBeVisible();

          const resultComments = responseWrapper.locator(
            '[data-test-subj="osquery-results-comment"]'
          );
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment
          const firstResultComment = resultComments.first();
          await expect(firstResultComment).toBeVisible({ timeout: 120_000 });

          await expect(firstResultComment.locator('[data-test-subj="viewInDiscover"]')).toBeVisible(
            {
              timeout: 30_000,
            }
          );
          await expect(firstResultComment.locator('[data-test-subj="viewInLens"]')).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.locator('[data-test-subj="addToCaseButton"]')
          ).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.getByRole('button', { name: 'Add to Timeline investigation' })
          ).toBeVisible({ timeout: 30_000 });
        });

        await test.step('Navigate to Discover and verify results', async () => {
          const resultComments = page.testSubj
            .locator('responseActionsViewWrapper')
            .locator('[data-test-subj="osquery-results-comment"]');
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment in alert flyout
          const discoverLink = resultComments.first().locator('[data-test-subj="viewInDiscover"]');
          await expect(discoverLink).toBeVisible({ timeout: 30_000 });
          await expect(discoverLink).toHaveAttribute('href');
          const href = await discoverLink.getAttribute('href');

          const baseUrl = new URL(page.url()).origin;
          await page.goto(`${baseUrl}${href}`);

          // Discover may need reloads for data to appear
          const docTable = page.testSubj
            .locator('discoverDocTable')
            .or(page.testSubj.locator('unifiedDataTable'));
          const discoverStart = Date.now();
          while (Date.now() - discoverStart < 120_000) {
            if (await docTable.isVisible({ timeout: 15_000 }).catch(() => false)) break;
            await page.reload();
          }

          await expect(docTable).toBeVisible({ timeout: 30_000 });
          await expect(page.getByText(/action_data\.query\s*.+;/)).toBeVisible();
          await expect(page.getByText(discoverRegex)).toBeVisible();
        });
      }
    );

    test(
      'can visit lens from response action results',
      { tag: [...tags.stateful.classic] },
      async ({ page }) => {
        test.setTimeout(180_000); // Alert tests can take time
        const lensRegex = new RegExp(`Action ${UUID_REGEX} results`);

        await test.step('Expand alert and open response action results', async () => {
          // eslint-disable-next-line playwright/no-nth-methods -- first alert row
          await page.testSubj.locator('expand-event').first().click();
          await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
          await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
          const responseWrapper = page.testSubj.locator('responseActionsViewWrapper');
          await expect(responseWrapper).toBeVisible();

          const resultComments = responseWrapper.locator(
            '[data-test-subj="osquery-results-comment"]'
          );
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment
          const firstResultComment = resultComments.first();
          await expect(firstResultComment).toBeVisible({ timeout: 120_000 });

          await expect(firstResultComment.locator('[data-test-subj="viewInDiscover"]')).toBeVisible(
            {
              timeout: 30_000,
            }
          );
          await expect(firstResultComment.locator('[data-test-subj="viewInLens"]')).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.locator('[data-test-subj="addToCaseButton"]')
          ).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.getByRole('button', { name: 'Add to Timeline investigation' })
          ).toBeVisible({ timeout: 30_000 });
        });

        await test.step('Click View in Lens and verify new tab', async () => {
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment
          const firstResultComment = page.testSubj.locator('osquery-results-comment').first();
          const lensButton = firstResultComment.locator('[aria-label="View in Lens"]');

          const [newPage] = await Promise.all([
            page.context().waitForEvent('page'),
            lensButton.click(),
          ]);

          await newPage.waitForLoadState();
          await expect(newPage.locator('[data-test-subj="lnsWorkspace"]')).toBeVisible({
            timeout: 60_000,
          });
          await expect(
            newPage.locator('[data-test-subj="breadcrumbs"]').getByText(lensRegex)
          ).toBeVisible({ timeout: 30_000 });

          await newPage.close();
        });
      }
    );

    test(
      'can add to timeline from response action results',
      { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
      async ({ page }) => {
        test.setTimeout(180_000); // Alert tests can take time
        const timelineRegex = new RegExp(`Added ${UUID_REGEX} to Timeline`);
        const filterRegex = new RegExp(`action_id: "${UUID_REGEX}"`);

        await test.step('Expand alert and open response action results', async () => {
          // eslint-disable-next-line playwright/no-nth-methods -- first alert row
          await page.testSubj.locator('expand-event').first().click();
          await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
          await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
          const responseWrapper = page.testSubj.locator('responseActionsViewWrapper');
          await expect(responseWrapper).toBeVisible();

          const resultComments = responseWrapper.locator(
            '[data-test-subj="osquery-results-comment"]'
          );
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment
          const firstResultComment = resultComments.first();
          await expect(firstResultComment).toBeVisible({ timeout: 120_000 });

          await expect(firstResultComment.locator('[data-test-subj="viewInDiscover"]')).toBeVisible(
            {
              timeout: 30_000,
            }
          );
          await expect(firstResultComment.locator('[data-test-subj="viewInLens"]')).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.locator('[data-test-subj="addToCaseButton"]')
          ).toBeVisible({
            timeout: 30_000,
          });
          await expect(
            firstResultComment.getByRole('button', { name: 'Add to Timeline investigation' })
          ).toBeVisible({ timeout: 30_000 });
        });

        await test.step('Add to timeline and verify', async () => {
          // eslint-disable-next-line playwright/no-nth-methods -- first osquery result comment
          const firstResultComment = page.testSubj.locator('osquery-results-comment').first();
          // eslint-disable-next-line playwright/no-nth-methods -- first table row in results
          const firstTableRow = firstResultComment.locator('.euiTableRow').first();
          await firstTableRow.locator('[data-test-subj="add-to-timeline"]').click();

          await expect(page.getByText(timelineRegex)).toBeVisible();
          await page.testSubj
            .locator('securitySolutionFlyoutNavigationCollapseDetailButton')
            .click();
          await page.testSubj.locator('timeline-bottom-bar').getByText('Untitled timeline').click();
          await expect(page.getByText(filterRegex)).toBeVisible();
        });
      }
    );
  }
);
