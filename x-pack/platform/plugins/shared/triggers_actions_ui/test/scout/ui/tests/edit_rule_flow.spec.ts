/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

// Migrated from: x-pack/platform/test/functional_with_es_ssl/apps/rules/rules_page/edit_rule_flow.ts
// Rule type substitution: test.noop → .es-query (test.noop not registered in
// Scout's stateful/classic config). The edit form pre-populates all params
// from the API-created rule; tests only change the name field and do not
// interact with rule-type-specific controls.
//
// Note: each Playwright test has a fresh browser session so the FTR pattern
// of chaining tests through shared browser state is not used here. Instead
// each test navigates independently to set up the correct return-path context
// before asserting the post-save/cancel destination.
//
// Inner test.describe blocks are flattened (max nesting depth = 1); context is
// preserved in the test name prefixes ("Edit from rules list: …" and
// "Edit from rule details page: …").

const RULES_LIST_URL_RE = /\/app\/rules(\/|$|\?|#)/;
const RULES_EDIT_URL_RE = /\/app\/rules\/edit\//;
const RULES_DETAILS_URL_RE = /\/app\/rules\/rule\//;

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

  test('Edit from rules list: navigates to edit page when clicking edit button', async ({
    page,
  }) => {
    await page.gotoApp('rules');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();

    // Hover reveals the edit (pencil) action button in the row.
    // Playwright's click() triggers an automatic hover, but an explicit
    // hover on the row first ensures the button is visible before clicking.
    await page.testSubj.locator(`checkboxSelectRow-${testRuleId}`).hover();
    await page.testSubj.click('editActionHoverButton');

    await page.waitForURL(RULES_EDIT_URL_RE);
    expect(page.url()).toContain(`/app/rules/edit/${testRuleId}`);

    await expect(page.testSubj.locator('ruleForm')).toBeVisible();
    await expect(page.testSubj.locator('ruleDetailsNameInput')).toHaveValue(testRuleName);
  });

  test('Edit from rules list: returns to rules list after saving', async ({
    page,
    apiServices,
  }) => {
    const updatedName = `${testRuleName}-updated`;

    await page.gotoApp('rules');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();

    await page.testSubj.locator(`checkboxSelectRow-${testRuleId}`).hover();
    await page.testSubj.click('editActionHoverButton');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await page.testSubj.locator('ruleDetailsNameInput').fill(updatedName);

    // Edit saves directly — the create-confirmation modal only appears for new rules.
    await page.testSubj.click('rulePageFooterSaveButton');

    await page.waitForURL(RULES_LIST_URL_RE);
    expect(page.url()).not.toMatch(RULES_EDIT_URL_RE);
    await expect(page.testSubj.locator('createRuleButton')).toBeVisible();

    // Verify the name was actually persisted (matches FTR's getRuleById assertion).
    const saved = await apiServices.alerting.rules.get(testRuleId);
    expect(saved.data.name).toBe(updatedName);

    // Reset the name so subsequent tests start from a known state.
    await apiServices.alerting.rules.update(testRuleId, { name: testRuleName });
  });

  test('Edit from rules list: returns to rules list after clicking cancel', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.get(`/app/rules/edit/${testRuleId}`));
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await page.testSubj.click('rulePageFooterCancelButton');

    await page.waitForURL(RULES_LIST_URL_RE);
    expect(page.url()).not.toMatch(RULES_EDIT_URL_RE);
    await expect(page.testSubj.locator('createRuleButton')).toBeVisible();
  });

  // ── Edit from rule details page ──────────────────────────────────────────────

  test('Edit from rule details page: navigates to edit page when clicking edit button', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.get(`/app/rules/rule/${testRuleId}`));
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();

    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');

    await page.waitForURL(RULES_EDIT_URL_RE);
    expect(page.url()).toContain(`/app/rules/edit/${testRuleId}`);
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();
  });

  test('Edit from rule details page: returns to rule details page after saving', async ({
    page,
    kbnUrl,
    apiServices,
  }) => {
    const updatedName = `${testRuleName}-details-v2`;

    // Navigate via details page so the edit page has the correct return path.
    await page.goto(kbnUrl.get(`/app/rules/rule/${testRuleId}`));
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();

    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await page.testSubj.locator('ruleDetailsNameInput').fill(updatedName);

    // Edit saves directly — the create-confirmation modal only appears for new rules.
    await page.testSubj.click('rulePageFooterSaveButton');

    await page.waitForURL(RULES_DETAILS_URL_RE);
    expect(page.url()).toContain(`/app/rules/rule/${testRuleId}`);
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();

    // Verify the name was actually persisted (matches FTR's getRuleById assertion).
    const saved = await apiServices.alerting.rules.get(testRuleId);
    expect(saved.data.name).toBe(updatedName);

    // Reset the name so subsequent tests start from a known state.
    await apiServices.alerting.rules.update(testRuleId, { name: testRuleName });
  });

  test('Edit from rule details page: returns to rule details page after clicking cancel', async ({
    page,
    kbnUrl,
  }) => {
    await page.goto(kbnUrl.get(`/app/rules/rule/${testRuleId}`));
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();

    await page.testSubj.click('ruleActionsButton');
    await page.testSubj.click('openEditRuleFlyoutButton');
    await expect(page.testSubj.locator('ruleForm')).toBeVisible();

    await page.testSubj.click('rulePageFooterCancelButton');

    await page.waitForURL(RULES_DETAILS_URL_RE);
    expect(page.url()).toContain(`/app/rules/rule/${testRuleId}`);
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible();
  });
});
