/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule, openRulesListAndSearch, searchRulesList } from '../fixtures';

const SM_BASE = 'management/insightsAndAlerting/triggersActions';
// Matches the rules list root (.../triggersActions or .../triggersActions/) but
// NOT sub-routes like /edit/ or /rule/ — those share the same prefix.
const RULES_LIST_URL_RE = new RegExp(`/app/${SM_BASE}/?(?:\\?|#|$)`);
const RULES_EDIT_URL_RE = new RegExp(`/app/${SM_BASE}/edit/`);
const RULES_DETAILS_URL_RE = new RegExp(`/app/${SM_BASE}/rule/`);

test.describe('Edit Rule Flow', { tag: tags.stateful.classic }, () => {
  let testRuleId: string;
  let testRuleName: string;

  test.beforeAll(async ({ apiServices }) => {
    const response = await apiServices.alerting.rules.create(makeEsQueryRule('scout-edit-rule'));
    testRuleId = response.data.id;
    testRuleName = response.data.name as string;
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    if (testRuleId) {
      await apiServices.alerting.rules.delete(testRuleId);
    }
  });

  // ── Edit from rules list ─────────────────────────────────────────────────────

  test('Edit from rules list: navigate, cancel, and save', async ({ page, apiServices }) => {
    await openRulesListAndSearch(page, testRuleName);

    await test.step('navigates to edit page when clicking edit button', async () => {
      // Hover reveals the edit (pencil) action button in the row.
      await page.testSubj.locator(`checkboxSelectRow-${testRuleId}`).hover();
      await page.testSubj.click('editActionHoverButton');

      await expect(page).toHaveURL(RULES_EDIT_URL_RE);
      expect(page.url()).toContain(`/${SM_BASE}/edit/${testRuleId}`);
      await expect(page.testSubj.locator('ruleForm')).toBeVisible();
      await expect(page.testSubj.locator('ruleDetailsNameInput')).toHaveValue(testRuleName);
    });

    await test.step('returns to rules list after clicking cancel', async () => {
      await page.testSubj.click('rulePageFooterCancelButton');

      await expect(page).toHaveURL(RULES_LIST_URL_RE);
      expect(page.url()).not.toMatch(RULES_EDIT_URL_RE);
      await expect(page.testSubj.locator('createRuleButton')).toBeVisible();
    });

    await test.step('returns to rules list after saving', async () => {
      const updatedName = `${testRuleName}-updated`;

      await searchRulesList(page, testRuleName);
      await page.testSubj.locator(`checkboxSelectRow-${testRuleId}`).hover();
      await page.testSubj.click('editActionHoverButton');
      await expect(page.testSubj.locator('ruleForm')).toBeVisible();

      await page.testSubj.locator('ruleDetailsNameInput').fill(updatedName);
      await page.testSubj.click('rulePageFooterSaveButton');

      await expect(page).toHaveURL(RULES_LIST_URL_RE);
      expect(page.url()).not.toMatch(RULES_EDIT_URL_RE);
      await expect(page.testSubj.locator('createRuleButton')).toBeVisible();

      const saved = await apiServices.alerting.rules.get(testRuleId);
      expect(saved.data.name).toBe(updatedName);
      await apiServices.alerting.rules.update(testRuleId, { name: testRuleName });
    });
  });

  // ── Edit from rule details page ──────────────────────────────────────────────

  test('Edit from rule details page: navigate, cancel, and save', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    await page.goto(kbnUrl.get(`/app/${SM_BASE}/rule/${testRuleId}`));
    await expect(page.testSubj.locator('appHeaderTitle')).toBeVisible();

    await test.step('navigates to edit page when clicking edit button', async () => {
      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('openEditRuleFlyoutButton');

      await expect(page).toHaveURL(RULES_EDIT_URL_RE);
      expect(page.url()).toContain(`/${SM_BASE}/edit/${testRuleId}`);
      await expect(page.testSubj.locator('ruleForm')).toBeVisible();
    });

    await test.step('returns to rule details page after clicking cancel', async () => {
      await page.testSubj.click('rulePageFooterCancelButton');

      await expect(page).toHaveURL(RULES_DETAILS_URL_RE);
      expect(page.url()).toContain(`/${SM_BASE}/rule/${testRuleId}`);
      await expect(page.testSubj.locator('appHeaderTitle')).toBeVisible();
    });

    await test.step('returns to rule details page after saving', async () => {
      const updatedName = `${testRuleName}-details-v2`;

      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('openEditRuleFlyoutButton');
      await expect(page.testSubj.locator('ruleForm')).toBeVisible();

      await page.testSubj.locator('ruleDetailsNameInput').fill(updatedName);
      await page.testSubj.click('rulePageFooterSaveButton');

      await expect(page).toHaveURL(RULES_DETAILS_URL_RE);
      expect(page.url()).toContain(`/${SM_BASE}/rule/${testRuleId}`);
      await expect(page.testSubj.locator('appHeaderTitle')).toBeVisible();

      const saved = await apiServices.alerting.rules.get(testRuleId);
      expect(saved.data.name).toBe(updatedName);
      await apiServices.alerting.rules.update(testRuleId, { name: testRuleName });
    });
  });
});
