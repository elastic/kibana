/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, makeIndexThresholdRule, openRulesListAndSearch } from '../fixtures';

interface RuleSnoozeState {
  muteAll: boolean;
  isSnoozed: boolean;
  scheduleCount: number;
}

const getRuleSnoozeState = async (
  kbnClient: KbnClient,
  ruleId: string
): Promise<RuleSnoozeState> => {
  const { data } = await kbnClient.request<{
    mute_all: boolean;
    snooze_schedule?: Array<{ id?: string }>;
    is_snoozed_until?: string | null;
  }>({ method: 'GET', path: `/internal/alerting/rule/${ruleId}` });
  const schedules = data.snooze_schedule ?? [];
  return {
    muteAll: data.mute_all,
    isSnoozed: Boolean(data.is_snoozed_until),
    scheduleCount: schedules.length,
  };
};

const expectRuleSnoozeState = (
  kbnClient: KbnClient,
  ruleId: string,
  expected: Partial<RuleSnoozeState>
) => expect.poll(() => getRuleSnoozeState(kbnClient, ruleId)).toMatchObject(expected);

test.describe('Rules list bulk actions', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices }) => {
    const ids = [...createdRuleIds];
    createdRuleIds.length = 0;
    await Promise.allSettled(ids.map((id) => apiServices.alerting.rules.delete(id)));
  });

  test('should allow rules to be snoozed', async ({ page, apiServices, kbnClient }) => {
    const searchKey = `scout-ba-snooze-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-b`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await openRulesListAndSearch(page, searchKey);

    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkSnooze');
    await expect(page.testSubj.locator('snoozePanel')).toBeVisible();
    await page.testSubj.click('linkSnooze1h');

    // Per rule, wait for the persisted snooze, then verify the row shows the snoozed badge
    // (row-scoped — text search is tokenized and would match both rules).
    for (const id of [r1.data.id, r2.data.id]) {
      await expectRuleSnoozeState(kbnClient, id, {
        muteAll: false,
        isSnoozed: true,
        scheduleCount: 1,
      });

      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-snoozed"]')).toBeVisible();
    }
  });

  test('should allow rules to be unsnoozed', async ({ page, apiServices, kbnClient }) => {
    const searchKey = `scout-ba-unsnooze-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-b`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);
    await Promise.all([
      apiServices.alerting.rules.snooze(r1.data.id, 100_000_000),
      apiServices.alerting.rules.snooze(r2.data.id, 100_000_000),
    ]);

    await openRulesListAndSearch(page, searchKey);

    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkUnsnooze');
    await expect(page.testSubj.locator('bulkUnsnoozeConfirmationModal')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    for (const id of [r1.data.id, r2.data.id]) {
      await expectRuleSnoozeState(kbnClient, id, {
        muteAll: false,
        isSnoozed: false,
        scheduleCount: 0,
      });

      // Assert the badge an unsnoozed row renders rather than the absence of the snoozed
      // one, which would also pass while the row is re-rendering.
      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-unsnoozed"]')).toBeAttached();
    }
  });

  test('should allow rule snooze to be scheduled', async ({ page, apiServices, kbnClient }) => {
    const searchKey = `scout-ba-schedule-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-b`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);

    await openRulesListAndSearch(page, searchKey);

    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkSnoozeSchedule');
    await expect(page.testSubj.locator('ruleSnoozeScheduler')).toBeVisible();
    await page.testSubj.click('scheduler-saveSchedule');

    for (const id of [r1.data.id, r2.data.id]) {
      await expectRuleSnoozeState(kbnClient, id, { scheduleCount: 1 });

      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-scheduled"]')).toBeVisible();
    }
  });

  test('should allow rule schedule to be removed', async ({ page, apiServices, kbnClient }) => {
    const searchKey = `scout-ba-unschedule-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-b`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);
    await Promise.all([
      apiServices.alerting.rules.scheduleSnooze(r1.data.id, { id: crypto.randomUUID() }),
      apiServices.alerting.rules.scheduleSnooze(r2.data.id, { id: crypto.randomUUID() }),
    ]);

    await openRulesListAndSearch(page, searchKey);

    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkRemoveSnoozeSchedule');
    await expect(page.testSubj.locator('bulkRemoveScheduleConfirmationModal')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    for (const id of [r1.data.id, r2.data.id]) {
      await expectRuleSnoozeState(kbnClient, id, { scheduleCount: 0 });

      const row = page
        .locator('tr')
        .filter({ has: page.testSubj.locator(`checkboxSelectRow-${id}`) });
      await expect(row.locator('[data-test-subj="rulesListNotifyBadge-unsnoozed"]')).toBeAttached();
    }
  });

  test('can bulk update API key', async ({ page, apiServices }) => {
    const searchKey = `scout-ba-apikey-${Date.now()}`;
    const [r1, r2] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-b`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id);
    const r1UpdatedAt = r1.data.updated_at;
    const r2UpdatedAt = r2.data.updated_at;

    await openRulesListAndSearch(page, searchKey);

    // Select r1, select-all (both selected), then deselect r2 → only r1 remains
    await page.testSubj.click(`checkboxSelectRow-${r1.data.id}`);
    await page.testSubj.click('selectAllRulesButton');
    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);

    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('updateAPIKeys');
    await expect(page.testSubj.locator('updateApiKeyIdsConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect
      .poll(async () => (await apiServices.alerting.rules.get(r1.data.id)).data.updated_at)
      .not.toStrictEqual(r1UpdatedAt);
    await expect
      .poll(async () => (await apiServices.alerting.rules.get(r2.data.id)).data.updated_at)
      .toStrictEqual(r2UpdatedAt);
  });

  test('should apply filters to bulk actions when using the select all button', async ({
    page,
    apiServices,
  }) => {
    const searchKey = `scout-ba-filter-${Date.now()}`;
    // r1, r3 = .es-query; r2 = .index-threshold (different type for filter test)
    const [r1, r2, r3] = await Promise.all([
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-a`)),
      apiServices.alerting.rules.create(makeIndexThresholdRule(`${searchKey}-b`)),
      apiServices.alerting.rules.create(makeEsQueryRule(`${searchKey}-c`)),
    ]);
    createdRuleIds.push(r1.data.id, r2.data.id, r3.data.id);

    await openRulesListAndSearch(page, searchKey);

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

    // Verify the persisted enabled flags: only the filtered .es-query rules were disabled.
    for (const { id, expectedEnabled } of [
      { id: r1.data.id, expectedEnabled: false },
      { id: r2.data.id, expectedEnabled: true },
      { id: r3.data.id, expectedEnabled: false },
    ]) {
      await expect
        .poll(async () => (await apiServices.alerting.rules.get(id)).data.enabled)
        .toBe(expectedEnabled);
    }

    await openRulesListAndSearch(page, searchKey);

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

    await page.testSubj.click('ruleStatusFilterButton');
    await page.testSubj.click('ruleStatusFilterOption-enabled');
    await page.testSubj.click('ruleStatusFilterButton');

    await page.testSubj.click(`checkboxSelectRow-${r2.data.id}`);
    await page.testSubj.click('selectAllRulesButton');

    await page.testSubj.click('showBulkActionButton');
    await page.testSubj.click('bulkDelete');
    await expect(page.testSubj.locator('rulesDeleteConfirmation')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect
      .poll(async () => {
        const found = await apiServices.alerting.rules.find({ search: searchKey });
        return found.data.data.map((rule: { id: string }) => rule.id).sort();
      })
      .toStrictEqual([r1.data.id, r3.data.id].sort());
    // r2 was deleted by the test; reset cleanup list to only the surviving rules.
    createdRuleIds.length = 0;
    createdRuleIds.push(r1.data.id, r3.data.id);
  });
});
