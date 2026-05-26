/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/rules_page/create_rule_flow.ts
// Rule type substitution: test.noop (FTR-only, no required params) → .index-threshold
// (built-in, always registered in Scout). Tests 4–5 must fill the index + time-field
// fields to satisfy validation before saving; the FTR equivalents skipped this step
// because test.noop had no required params.

const RULES_DETAILS_URL_RE = /\/app\/rules\/rule\//;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Opens the index popover, picks the first index option after typing '.kibana',
// selects the first date field that loads, then closes the popover.
// Mirrors the FTR defineEsQueryAlert / screenshot_creation patterns.
const fillIndexThresholdForm = async (page: ScoutPage, name: string) => {
  await page.testSubj.locator('ruleDetailsNameInput').fill(name);

  await page.testSubj.click('selectIndexExpression');

  // Type to trigger the debounced index search (250 ms debounce)
  const comboInput = page.testSubj.locator('thresholdIndexesComboBox').locator('input');
  await comboInput.fill('.kibana');

  // Wait for the listbox to appear; even if no real indices match, the "Choose…"
  // fallback group always renders the typed pattern as a selectable option.
  const listbox = page.locator('[role="listbox"]');
  await listbox.waitFor({ state: 'visible', timeout: 15_000 });
  await listbox.locator('[role="option"]:first-child').click();

  // After index selection the form calls getFieldsForWildcard async.
  // Wait for at least one real time-field option to appear (index 0 is the
  // "Select a field" placeholder, index 1 is the first real date field).
  const timeFieldSelect = page.testSubj.locator('thresholdAlertTimeFieldSelect');
  await expect(timeFieldSelect.locator('option:nth-child(2)')).toBeAttached({ timeout: 15_000 });

  const firstFieldValue = await timeFieldSelect
    .locator('option:nth-child(2)')
    .getAttribute('value');
  await timeFieldSelect.selectOption(firstFieldValue!);

  await page.testSubj.click('closePopover');
};

// Saves the rule form, confirms the "no actions" modal if it appears, waits for
// redirect to the rule details page, and returns the new rule ID from the URL.
const saveRuleAndGetId = async (page: ScoutPage): Promise<string> => {
  await page.testSubj.click('rulePageFooterSaveButton');

  // Admin creating a rule with no actions sees a confirmation modal. Wait up to
  // 3 s for it; if it never appears, proceed (the form may have saved directly).
  await page.testSubj
    .locator('confirmCreateRuleModal')
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => page.testSubj.click('confirmModalConfirmButton'))
    .catch(() => {});

  await page.waitForURL(RULES_DETAILS_URL_RE);
  const match = page.url().match(/\/app\/rules\/rule\/([^/?#]+)/);
  if (!match) throw new Error(`Could not parse rule ID from URL: ${page.url()}`);
  return match[1];
};

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Create Rule Flow', { tag: tags.stateful.classic }, () => {
  const createdRuleIds: string[] = [];

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();
  });

  test.afterEach(async ({ apiServices }) => {
    const ids = [...createdRuleIds];
    createdRuleIds.length = 0;
    await Promise.allSettled(ids.map((id) => apiServices.alerting.rules.delete(id)));
  });

  test('create rule button is visible and enabled', async ({ page }) => {
    const btn = page.testSubj.locator('createRuleButton');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('clicking create rule button opens rule type modal', async ({ page }) => {
    await page.testSubj.click('createRuleButton');
    await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();
  });

  test('selecting a rule type navigates to create form', async ({ page }) => {
    await page.testSubj.click('createRuleButton');
    await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();
    // Use .index-threshold (built-in, always available) instead of test.noop.
    await page.testSubj.click('.index-threshold-SelectOption');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();
  });

  test('creates a rule and displays it in the rules list', async ({ page }) => {
    const ruleName = `scout-create-rule-${Date.now()}`;

    await page.testSubj.click('createRuleButton');
    await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();
    await page.testSubj.click('.index-threshold-SelectOption');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await fillIndexThresholdForm(page, ruleName);

    const ruleId = await saveRuleAndGetId(page);
    createdRuleIds.push(ruleId);

    // Navigate back to the rules list and verify the new rule is visible.
    await page.gotoApp('rules');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();
    await page.testSubj.locator('searchInput').fill(ruleName);
    await expect(page.testSubj.locator('rulesList').getByText(ruleName)).toBeVisible();
  });

  test('return path is set correctly after rule creation', async ({ page }) => {
    const ruleName = `scout-create-return-path-${Date.now()}`;

    await page.testSubj.click('createRuleButton');
    await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();
    await page.testSubj.click('.index-threshold-SelectOption');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await fillIndexThresholdForm(page, ruleName);

    const ruleId = await saveRuleAndGetId(page);
    createdRuleIds.push(ruleId);

    // After creation the app redirects to the rule details page.
    expect(page.url()).toContain(`/app/rules/rule/${ruleId}`);
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();
  });
});
