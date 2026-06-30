/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, makeIndexThresholdRule } from '../fixtures';

// ── API helpers ──────────────────────────────────────────────────────────────

const scheduleRuleSnooze = async (kbnClient: KbnClient, ruleId: string) => {
  await kbnClient.request({
    method: 'POST',
    path: `/internal/alerting/rule/${ruleId}/_snooze`,
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      snooze_schedule: {
        duration: 0,
        id: 'scout-schedule-id',
        rRule: {
          count: 1,
          dtstart: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          tzid: 'UTC',
        },
      },
    },
  });
};

// Switch to the Rules tab to trigger a list refresh (mirrors FTR's refreshAlertsList).
const refreshRulesList = async (page: ScoutPage) => {
  await page.testSubj.click('logsTab');
  await page.testSubj.click('rulesTab');
};

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Rules list bulk actions', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
    await page.testSubj.click('rulesTab');
  });

  test.afterEach(async ({ apiServices }) => {
    const ids = [...createdRuleIds];
    createdRuleIds.length = 0;
    await Promise.allSettled(ids.map((id) => apiServices.alerting.rules.delete(id)));
  });

  test('should allow rules to be snoozed', async ({ page, apiServices }) => {
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('snooze-a')),
      apiServices.alerting.rules.create(makeEsQueryRule('snooze-b')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await refreshRulesList(page);

    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkSnooze');
    await expect(page.testSubj.locator('snoozePanel')).toBeVisible();
    await page.testSubj.click('linkSnooze1h');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Updated snooze settings for 2 rules.'
    );

    // Verify each rule's row shows the snoozed badge (row-scoped — text search is
    // tokenized and would match both rules).
    for (const id of [r1.data.id, r2.data.id]) {
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-snoozed"]')).toBeVisible();
    }
  });

  test('should allow rules to be unsnoozed', async ({ page, apiServices }) => {
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('unsnooze-a')),
      apiServices.alerting.rules.create(makeEsQueryRule('unsnooze-b')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);
    await Promise.all([
      apiServices.alerting.rules.snooze(r1.data.id, 100_000_000),
      apiServices.alerting.rules.snooze(r2.data.id, 100_000_000),
    ]);

    await refreshRulesList(page);

    await page.testSubj.locator('ruleSearchField').fill('');
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkUnsnooze');
    await expect(page.testSubj.locator('bulkUnsnoozeConfirmationModal')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Updated snooze settings for 2 rules.'
    );

    for (const id of [r1.data.id, r2.data.id]) {
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-snoozed"]')).toBeHidden();
    }
  });

  test('should allow rule snooze to be scheduled', async ({ page, apiServices }) => {
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('schedule-snooze-a')),
      apiServices.alerting.rules.create(makeEsQueryRule('schedule-snooze-b')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await refreshRulesList(page);

    await page.testSubj.locator('ruleSearchField').fill('');
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkSnoozeSchedule');
    await expect(page.testSubj.locator('ruleSnoozeScheduler')).toBeVisible();
    await page.testSubj.click('scheduler-saveSchedule');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Updated snooze settings for 2 rules.'
    );

    for (const id of [r1.data.id, r2.data.id]) {
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-scheduled"]')).toBeVisible();
    }
  });

  test('should allow rule schedule to be removed', async ({ page, apiServices, kbnClient }) => {
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('remove-schedule-a')),
      apiServices.alerting.rules.create(makeEsQueryRule('remove-schedule-b')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);
    await Promise.all([
      scheduleRuleSnooze(kbnClient, r1.data.id),
      scheduleRuleSnooze(kbnClient, r2.data.id),
    ]);

    await refreshRulesList(page);

    await page.testSubj.locator('ruleSearchField').fill('');
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkRemoveSnoozeSchedule');
    await expect(page.testSubj.locator('bulkRemoveScheduleConfirmationModal')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Updated snooze settings for 2 rules.'
    );

    for (const id of [r1.data.id, r2.data.id]) {
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-scheduled"]')).toBeHidden();
    }
  });

  test('can bulk update API key', async ({ page, apiServices }) => {
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('api-key-a')),
      apiServices.alerting.rules.create(makeEsQueryRule('api-key-b')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await refreshRulesList(page);

    await page.testSubj.locator('ruleSearchField').fill('');
    // Select r1, select-all (both selected), then deselect r2 → only r1 remains
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click('selectAllRulesButton');
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);

    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('updateAPIKeys');
    await expect(page.testSubj.locator('updateApiKeyIdsConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      'Updated API key for 1 rule.'
    );
  });

  test('should apply filters to bulk actions when using the select all button', async ({
    page,
    apiServices,
  }) => {
    // r1, r3 = .es-query; r2 = .index-threshold (different type for filter test)
    const [r1, r2, r3] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule('bulk-filter-a')),
      apiServices.alerting.rules.create(makeIndexThresholdRule('bulk-filter-b')),
      apiServices.alerting.rules.create(makeEsQueryRule('bulk-filter-c')),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id, r3.data.id);

    await refreshRulesList(page);

    await expect(page.testSubj.locator('totalRulesCount')).toContainText('3 rules');

    // Filter to only .es-query rules (r1 and r3)
    await page.testSubj.click('ruleTypeFilterButton');
    await page.testSubj.click('ruleType.es-queryFilterOption');
    await page.testSubj.click('ruleTypeFilterButton'); // close dropdown

    // Select r1 then select-all to capture all filtered rules
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click('selectAllRulesButton');

    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkDisable');
    await expect(page.testSubj.locator('untrackAlertsModal')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText('Disabled 2 rules');

    // Navigate fresh then clear the type filter if it persisted.
    await page.gotoApp('rules');
    await page.testSubj.click('rulesTab');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();
    await page.testSubj
      .locator('rules-list-clear-filter')
      .click({ timeout: 5_000 })
      .catch((e: Error) => {
        if (!e.message.includes('Timeout')) throw e;
      });

    // Verify each rule's status by row (text search is tokenized and matches all rows).
    for (const { id, expectedStatus } of [
      { id: r1.data.id, expectedStatus: 'Disabled' },
      { id: r2.data.id, expectedStatus: 'Enabled' },
      { id: r3.data.id, expectedStatus: 'Disabled' },
    ]) {
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="statusDropdown"]')).toContainText(expectedStatus);
    }

    // Filter to enabled rules (only r2) and bulk-delete it
    await refreshRulesList(page);

    await page.testSubj.click('ruleStatusFilterButton');
    await page.testSubj.click('ruleStatusFilterOption-enabled');
    await page.testSubj.click('ruleStatusFilterButton');

    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('selectAllRulesButton');

    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkDelete');
    await expect(page.testSubj.locator('rulesDeleteConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText('Deleted 1 rule');
    // r2 was deleted by the test; reset cleanup list to only the surviving rules.
    createdRuleIds.length = 0;
    createdRuleIds.push(r1.data.id, r3.data.id);

    // Navigate fresh and clear the status filter before counting surviving rules.
    await page.gotoApp('rules');
    await page.testSubj.click('rulesTab');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();
    await page.testSubj
      .locator('rules-list-clear-filter')
      .click({ timeout: 5_000 })
      .catch((e: Error) => {
        if (!e.message.includes('Timeout')) throw e;
      });

    await expect(page.testSubj.locator('totalRulesCount')).toContainText('2 rules');
  });
});
