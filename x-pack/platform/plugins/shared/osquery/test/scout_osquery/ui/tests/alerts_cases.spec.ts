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
import {
  loadRule,
  cleanupRule,
  loadPack,
  cleanupPack,
  packFixture,
  loadCase,
  cleanupCase,
} from '../common/api_helpers';
import { waitForPageReady, waitForAlerts } from '../common/constants';

test.describe(
  'Alert Event Details - Cases',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let ruleId: string;
    let packId: string;
    let packName: string;
    const packData = packFixture();

    test.beforeAll(async ({ kbnClient }) => {
      const pack = await loadPack(kbnClient, packData);
      packId = pack.saved_object_id;
      packName = pack.name;

      const rule = await loadRule(kbnClient, true); // true for response actions
      ruleId = rule.id;
    });

    test.beforeEach(async ({ browserAuth, page, kbnUrl }) => {
      await browserAuth.loginWithCustomRole(socManagerRole);
      // Navigate to the rule and wait for alerts (reloads periodically until alerts appear)
      await page.goto(kbnUrl.get(`/app/security/rules/id/${ruleId}`));
      await waitForPageReady(page);
      await waitForAlerts(page);
    });

    test.afterAll(async ({ kbnClient }) => {
      await cleanupPack(kbnClient, packId);
      await cleanupRule(kbnClient, ruleId);
    });

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe('Case creation', () => {
      test('runs osquery against alert and creates a new case', async ({ page, kbnClient }) => {
        test.setTimeout(180_000); // Alert tests can take time

        const caseName = `Test case ${Date.now()}`;
        const caseDescription = `Test case description ${Date.now()}`;
        let capturedCaseId: string | undefined;

        await test.step('Expand alert and open osquery pack flyout', async () => {
          await page.testSubj.locator('expand-event').first().click();
          await page.testSubj.locator('securitySolutionFlyoutFooterDropdownButton').click();
          await page.testSubj.locator('osquery-action-item').click();
          await expect(page.getByText(/^\d+ agen(t|ts) selected/).first()).toBeVisible({
            timeout: 30_000,
          });
          await waitForPageReady(page);
          await page
            .getByText('Run a set of queries in a pack')
            .first()
            .waitFor({ state: 'visible' });

          await page.getByText('Run a set of queries in a pack').first().click();
          await expect(
            page.testSubj
              .locator('flyout-body-osquery')
              .locator('[data-test-subj="kibanaCodeEditor"]')
          ).not.toBeVisible();
          await waitForPageReady(page);

          const packSelect = page.testSubj.locator('select-live-pack');
          await packSelect.click();
          const comboInput = packSelect.locator('[data-test-subj="comboBoxSearchInput"]');
          await comboInput.click();
          await comboInput.fill(packName);
          await page.getByRole('option', { name: packName }).click();
        });

        await test.step('Submit query and wait for results', async () => {
          await page.getByText('Submit').first().waitFor({ state: 'visible' });
          await page.getByText('Submit').first().click();

          await expect(page.testSubj.locator('osqueryResultsTable')).toBeVisible({
            timeout: 120_000,
          });
          await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
            timeout: 120_000,
          });
        });

        await test.step('Add to case and create new case', async () => {
          await page.locator('[aria-label="Add to Case"]').first().click();
          await expect(page.getByText('Select case').first()).toBeVisible();
          await page.testSubj.locator('cases-table-add-case-filter-bar').click();
          await expect(page.testSubj.locator('create-case-flyout')).toBeVisible();

          await page.locator('input[aria-describedby="caseTitle"]').fill(caseName);
          await page.locator('textarea[aria-label="caseDescription"]').fill(caseDescription);

          const caseCreatePromise = page
            .waitForResponse(
              (response) =>
                response.url().includes('/api/cases') && response.request().method() === 'POST',
              { timeout: 30_000 }
            )
            .then(async (response) => {
              const body = await response.json();
              capturedCaseId = body.id;

              return response;
            });

          await page.testSubj.locator('create-case-submit').click();
          await caseCreatePromise;
          await expect(page.getByText(`An alert was added to "${caseName}"`).first()).toBeVisible();
        });

        if (capturedCaseId) {
          await cleanupCase(kbnClient, capturedCaseId);
        }
      });
    });

    // eslint-disable-next-line playwright/max-nested-describe
    test.describe('Case', () => {
      let caseId: string;

      test.beforeEach(async ({ kbnClient }) => {
        const caseData = await loadCase(kbnClient, 'securitySolution');
        caseId = caseData.id;
      });

      test.afterEach(async ({ kbnClient }) => {
        if (caseId) {
          await cleanupCase(kbnClient, caseId);
        }
      });

      test('sees osquery results from last action and add to a case', async ({ page }) => {
        test.setTimeout(180_000); // Alert tests can take time

        await test.step('Expand alert and open response actions', async () => {
          await page.testSubj.locator('expand-event').first().click();
          await page.testSubj.locator('securitySolutionFlyoutResponseSectionHeader').click();
          await page.testSubj.locator('securitySolutionFlyoutResponseButton').click();
          const responseWrapper = page.testSubj.locator('responseActionsViewWrapper');
          await expect(responseWrapper).toBeVisible({ timeout: 30_000 });

          await expect(responseWrapper).toContainText('select * from users', { timeout: 60_000 });
          await expect(responseWrapper).toContainText('SELECT * FROM os_version', {
            timeout: 30_000,
          });
        });

        await test.step('Check osquery results comments and action items', async () => {
          const resultComments = page.testSubj.locator('osquery-results-comment');
          const count = await resultComments.count();

          for (let i = 0; i < count; i++) {
            const comment = resultComments.nth(i);
            const rows = comment.locator('div .euiDataGridRow');
            const hasRows = await rows.count();

            if (hasRows === 0) {
              const tabs = comment.locator('div .euiTabs');
              if ((await tabs.count()) > 0) {
                await comment.locator('[data-test-subj="osquery-status-tab"]').click();
                await comment.locator('[data-test-subj="osquery-results-tab"]').click();
                // eslint-disable-next-line playwright/no-conditional-expect
                await expect(
                  comment.locator('[data-test-subj="dataGridRowCell"]').first()
                ).toBeVisible({ timeout: 120_000 });
              }
            } else {
              // eslint-disable-next-line playwright/no-conditional-expect
              await expect(
                comment.locator('[data-test-subj="dataGridRowCell"]').first()
              ).toBeVisible({
                timeout: 120_000,
              });
            }
          }

          await expect(page.getByText('View in Discover').first()).toBeVisible({ timeout: 30_000 });
          await expect(page.getByText('View in Lens').first()).toBeVisible({ timeout: 30_000 });
          await expect(page.getByText('Add to Case').first()).toBeVisible({ timeout: 30_000 });
          await expect(page.getByText('Add to Timeline investigation').first()).toBeVisible({
            timeout: 30_000,
          });
        });

        await test.step('Add to case and verify case content', async () => {
          await page.getByText('Add to Case').first().click();
          await expect(page.getByText('Select case').first()).toBeVisible();
          await page.testSubj.locator(`cases-table-row-select-${caseId}`).click();

          await page.getByText('View case').first().click();
          await expect(
            page.getByText(/attached Osquery results[\s]?[\d]+[\s]?second(?:s)? ago/)
          ).toBeVisible();
          await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
            timeout: 120_000,
          });
        });
      });
    });
  }
);
