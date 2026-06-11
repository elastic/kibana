/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Execution log" describe block.
//
// Opens the rule details Execution log tab and verifies the event-log list, its
// date/status filters and columns render after the rule has executed.
//
// FTR used test.always-firing; substituted with .es-query (built-in) plus a
// _run_soon to generate at least one event-log entry. Exact cell-value /
// sort-order assertions (data correctness) are intentionally not re-asserted —
// the focus here is the Execution log UI rendering and filtering.

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const runRuleSoon = async (kbnClient: KbnClient, ruleId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/internal/alerting/rule/${ruleId}/_run_soon`,
    headers: { 'kbn-xsrf': 'scout' },
  });
};

test.describe('Rule Details - Execution log', { tag: tags.stateful.classic }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices, kbnClient }) => {
    const resp = await apiServices.alerting.rules.create(makeEsQueryRule('exec-log'));
    ruleId = resp.data.id;
    // Generate at least one event-log entry to populate the list.
    await runRuleSoon(kbnClient, ruleId);
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await expect(pageObjects.ruleDetailsPage.ruleDetailsTitle).toBeVisible({ timeout: 20_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleId) await apiServices.alerting.rules.delete(ruleId);
  });

  test('renders the event log list and can filter by status', async ({ page }) => {
    await page.testSubj.click('eventLogListTab');

    // List, date picker and status picker render.
    await expect(page.testSubj.locator('eventLogList')).toBeVisible({ timeout: 20_000 });
    await expect(page.testSubj.locator('ruleEventLogListDatePicker')).toBeVisible();
    await expect(page.testSubj.locator('eventLogStatusFilterButton')).toBeVisible();

    // At least one event-log row is present after the rule executed.
    await expect(async () => {
      const rows = page.locator('.euiDataGridRow');
      expect(await rows.count()).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000, intervals: [2_000] });

    // The timestamp and total_search_duration columns render cells (selectors
    // match the FTR equivalent).
    await expect(
      page.locator('[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator(
        '[data-gridcell-column-id="total_search_duration"][data-test-subj="dataGridRowCell"]'
      )
    ).not.toHaveCount(0);

    // Apply the "success" status filter and confirm the list still renders.
    await page.testSubj.click('eventLogStatusFilterButton');
    await page.testSubj.click('eventLogStatusFilter-success');
    await page.testSubj.click('eventLogStatusFilterButton');
    await expect(page.testSubj.locator('eventLogList')).toBeVisible();
  });
});
