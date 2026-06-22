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
// _run_soon to generate at least one event-log entry.

import { tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const expectDurationCells = async (page: ScoutPage, colId: string) => {
  const durationCells = page.locator(
    `[data-gridcell-column-id="${colId}"][data-test-subj="dataGridRowCell"]`
  );
  await expect(durationCells).not.toHaveCount(0);
  const durationTexts = await durationCells.allTextContents();
  for (const raw of durationTexts.map((value) => value.trim()).filter(Boolean)) {
    // Grid cells may append an interactive marker (e.g. U+21A6); strip trailing
    // non-alphanumeric/colon chars before validating the duration format.
    const text = raw.replace(/[^\w:/]+$/, '');
    expect(text).toMatch(/^(?:N\/A|\d{2,}:\d{2})$/);
  }
};

const sortEventLogColumnAscending = async (page: ScoutPage, colId: string) => {
  await page.testSubj.locator(`dataGridHeaderCell-${colId}`).hover();
  await page.testSubj.click(`dataGridHeaderCellActionButton-${colId}`);
  await page.testSubj.locator(`dataGridHeaderCellActionGroup-${colId}`).waitFor();
  await page.testSubj
    .locator(`dataGridHeaderCellActionGroup-${colId}`)
    .getByRole('button', { name: 'Sort A-Z' })
    .click();
  await expect(page.testSubj.locator(`dataGridHeaderCellSortingIcon-${colId}`)).toBeVisible();
};

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
    const statusFilter = page.testSubj.locator('eventLogStatusFilterButton');
    await expect(statusFilter).toBeVisible();
    await expect(statusFilter.locator('.euiNotificationBadge')).toHaveText('0');

    // At least one event-log row is present (execution confirmed in beforeAll).
    await expect(page.locator('.euiDataGridRow')).not.toHaveCount(0, { timeout: 30_000 });

    // The timestamp and execution_duration columns render cells.
    const timestampCells = page.locator(
      '[data-gridcell-column-id="timestamp"][data-test-subj="dataGridRowCell"]'
    );
    await expect(timestampCells).not.toHaveCount(0);
    const timestampTexts = await timestampCells.allTextContents();
    expect(timestampTexts.some((text) => text.trim() !== '')).toBe(true);
    expect(timestampTexts.map((text) => text.trim().toLowerCase())).not.toContain('invalid date');

    await expectDurationCells(page, 'execution_duration');

    await page.testSubj.click('dataGridColumnSelectorButton');
    await page.testSubj.click('dataGridColumnSelectorToggleColumnVisibility-total_search_duration');
    await page.keyboard.press('Escape');
    await expectDurationCells(page, 'total_search_duration');

    // Apply the "success" status filter and confirm the filter badge updates.
    await statusFilter.click();
    await page.testSubj.click('eventLogStatusFilter-success');
    await expect(statusFilter.locator('.euiNotificationBadge')).toHaveText('1');
    await statusFilter.click();
    await expect(page.testSubj.locator('eventLogList')).toBeVisible();
    await expect(page.locator('.euiDataGridRow')).not.toHaveCount(0, { timeout: 10_000 });

    await sortEventLogColumnAscending(page, 'timestamp');
    await sortEventLogColumnAscending(page, 'total_search_duration');
  });
});
