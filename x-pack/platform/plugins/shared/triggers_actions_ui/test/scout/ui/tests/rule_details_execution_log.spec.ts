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

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

test.describe('Rule Details - Execution log', { tag: tags.stateful.classic }, () => {
  let ruleId: string;

  // beforeAll creates the rule, triggers a run, and waits for at least one
  // event-log entry to appear. Task manager backlog on CI can delay execution
  // well beyond 30s, so we give the hook 120s and use waitForExecutionCount
  // (90s budget) rather than relying on the test's toPass loop.
  test.beforeAll(async ({ apiServices }) => {
    test.setTimeout(120_000);
    const resp = await apiServices.alerting.rules.create(makeEsQueryRule('exec-log'));
    ruleId = resp.data.id;
    const dateStart = new Date();
    await apiServices.alerting.rules.runSoon(ruleId);
    await apiServices.alerting.waiting.waitForExecutionCount(
      ruleId,
      1,
      undefined,
      90_000,
      dateStart
    );
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
    // The rule has already executed (confirmed in beforeAll), so the extra
    // test budget is just a safety net.
    test.setTimeout(150_000);

    await page.testSubj.click('eventLogListTab');

    // List, date picker and status picker render.
    await expect(page.testSubj.locator('eventLogList')).toBeVisible({ timeout: 20_000 });
    await expect(page.testSubj.locator('ruleEventLogListDatePicker')).toBeVisible();
    await expect(page.testSubj.locator('eventLogStatusFilterButton')).toBeVisible();

    // At least one event-log row is present (execution confirmed in beforeAll).
    await expect(page.locator('.euiDataGridRow')).not.toHaveCount(0, { timeout: 30_000 });

    // The timestamp and execution_duration columns render cells. total_search_duration
    // is hidden by default (not in RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS) and
    // only appears once toggled on via the Columns button — a clean Playwright context
    // starts with empty localStorage so that column is never rendered.
    await expect(
      page.locator('[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator(
        '[data-gridcell-column-id="execution_duration"][data-test-subj="dataGridRowCell"]'
      )
    ).not.toHaveCount(0);

    // Apply the "success" status filter and confirm the list still renders.
    await page.testSubj.click('eventLogStatusFilterButton');
    await page.testSubj.click('eventLogStatusFilter-success');
    await page.testSubj.click('eventLogStatusFilterButton');
    await expect(page.testSubj.locator('eventLogList')).toBeVisible();
  });
});
