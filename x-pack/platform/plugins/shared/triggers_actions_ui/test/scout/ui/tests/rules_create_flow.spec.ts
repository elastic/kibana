/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, fillIndexThresholdForm } from '../fixtures';

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/rules_page/create_rule_flow.ts
// Rule type substitution: test.noop (FTR-only, no required params) → .index-threshold
// (built-in, always registered in Scout). Tests 4–5 must fill the index + time-field
// fields to satisfy validation before saving; the FTR equivalents skipped this step
// because test.noop had no required params.

const RULES_DETAILS_URL_RE = /\/app\/rules\/rule\//;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Saves the rule form, confirms the "no actions" modal if it appears, waits for
// redirect to the rule details page, and returns the new rule ID from the URL.
const saveRuleAndGetId = async (page: ScoutPage): Promise<string> => {
  await page.testSubj.click('rulePageFooterSaveButton');

  // Admin creating a rule with no actions sees a confirmation modal. Wait up to
  // 3 s for it; if it never appears (modal skipped), proceed normally.
  // Only TimeoutError is suppressed — any other error (network, validation) is
  // re-thrown so the root cause is immediately visible.
  await page.testSubj
    .locator('confirmCreateRuleModal')
    .waitFor({ state: 'visible', timeout: 3_000 })
    .then(() => page.testSubj.click('confirmModalConfirmButton'))
    .catch((e: unknown) => {
      if (e instanceof Error && e.name !== 'TimeoutError') throw e;
    });

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
