/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/details.ts
// Section: "Rule Details" header block (disable, snooze, re-enable, snooze schedule).
// Rule type: test.always-firing → .es-query with 1s interval (triggers interval-warning toast).
// Tests are stateful: state mutates across them (disable in test 3, re-enable in test 5).

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const createHeaderRule = async (kbnClient: KbnClient, name: string) => {
  const resp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/alerting/rule',
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      name,
      rule_type_id: '.es-query',
      consumer: 'stackAlerts',
      schedule: { interval: '1s' },
      actions: [],
      params: makeEsQueryRule(name).params,
    },
  });
  return resp.data;
};

test.describe('Rule Details - Header', { tag: tags.stateful.classic }, () => {
  let ruleId: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = await createHeaderRule(kbnClient, `header-test-rule-${Date.now()}`);
    ruleId = rule.id;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.ruleDetailsPage.gotoById(ruleId);
    await expect(pageObjects.ruleDetailsPage.ruleDetailsTitle).toBeVisible({ timeout: 20_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    if (ruleId) await apiServices.alerting.rules.delete(ruleId);
  });

  test('renders the rule details', async ({ page }) => {
    await expect(page.testSubj.locator('ruleDetailsTitle')).toContainText('header-test-rule');
    await expect(page.testSubj.locator('ruleSummaryRuleType')).toHaveText('Elasticsearch query');
    await expect(page.testSubj.locator('apiKeyOwnerLabel')).toContainText('elastic');
  });

  test('renders toast when schedule is less than configured minimum', async ({ page }) => {
    await expect(page.testSubj.locator('intervalConfigToast')).toBeVisible();
    await page.testSubj.click('ruleIntervalToastEditButton');
    await expect(page.testSubj.locator('rulePageFooterCancelButton')).toBeVisible();
    await page.testSubj.click('rulePageFooterCancelButton');
  });

  test('should disable the rule', async ({ page }) => {
    const statusDropdown = page.testSubj.locator('statusDropdown');
    await expect(statusDropdown).toContainText('Enabled');

    await statusDropdown.click();
    await page.testSubj.click('statusDropdownDisabledItem');
    await expect(page.testSubj.locator('confirmModalConfirmButton')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');

    await expect(statusDropdown).toContainText('Disabled', { timeout: 15_000 });
  });

  test('should allow you to snooze a disabled rule', async ({ page }) => {
    // Rule is DISABLED from the previous test
    const statusDropdown = page.testSubj.locator('statusDropdown');
    await expect(statusDropdown).toContainText('Disabled');

    const snoozeBadge = page.testSubj.locator('rulesListNotifyBadge-unsnoozed');
    await snoozeBadge.click();
    await page.testSubj.click('ruleSnoozeIndefiniteApply');
    await expect(page.testSubj.locator('rulesListNotifyBadge-snoozedIndefinitely')).toBeVisible({
      timeout: 15_000,
    });

    // Unsnooze before the next test
    await page.testSubj.locator('rulesListNotifyBadge-snoozedIndefinitely').click();
    await page.testSubj.click('ruleSnoozeCancel');
  });

  test('should reenable a disabled rule', async ({ page }) => {
    // Rule is DISABLED from test "should disable the rule"
    const statusDropdown = page.testSubj.locator('statusDropdown');
    await expect(statusDropdown).toContainText('Disabled');

    await statusDropdown.click();
    await page.testSubj.click('statusDropdownEnabledItem');

    await expect(statusDropdown).toContainText('Enabled', { timeout: 15_000 });
  });

  test('should snooze the rule', async ({ page }) => {
    const snoozeBadge = page.testSubj.locator('rulesListNotifyBadge-unsnoozed');
    await snoozeBadge.click();
    await page.testSubj.click('ruleSnoozeIndefiniteApply');
    await expect(page.testSubj.locator('rulesListNotifyBadge-snoozedIndefinitely')).toBeVisible({
      timeout: 15_000,
    });

    // Unsnooze before the next test
    await page.testSubj.locator('rulesListNotifyBadge-snoozedIndefinitely').click();
    await page.testSubj.click('ruleSnoozeCancel');
  });

  test('should snooze the rule for a set duration', async ({ page }) => {
    const snoozeBadge = page.testSubj.locator('rulesListNotifyBadge-unsnoozed');
    await snoozeBadge.click();
    await page.testSubj.click('linkSnooze8h');
    await expect(page.testSubj.locator('rulesListNotifyBadge-snoozed')).toBeVisible({
      timeout: 15_000,
    });

    // Unsnooze before the next test
    await page.testSubj.locator('rulesListNotifyBadge-snoozed').click();
    await page.testSubj.click('ruleSnoozeCancel');
  });

  test('should add snooze schedule', async ({ page }) => {
    const snoozeBadge = page.testSubj.locator('rulesListNotifyBadge-unsnoozed');
    await snoozeBadge.click();
    await page.testSubj.click('ruleAddSchedule');
    await page.testSubj.click('scheduler-saveSchedule');
    await expect(page.testSubj.locator('rulesListNotifyBadge-scheduled')).toBeVisible({
      timeout: 15_000,
    });

    // Remove schedule
    await page.testSubj.locator('rulesListNotifyBadge-scheduled').click();
    await page.testSubj.click('ruleRemoveAllSchedules');
    await expect(page.testSubj.locator('confirmModalConfirmButton')).toBeVisible();
    await page.testSubj.click('confirmModalConfirmButton');
  });
});
