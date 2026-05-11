/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, defineIndexThresholdRule } from '../fixtures';

interface RuleFindResponse {
  data: Array<{ id: string; name: string }>;
}

const findRuleIdByName = async (
  kbnClient: KbnClient,
  name: string
): Promise<string | undefined> => {
  const res = await kbnClient.request<RuleFindResponse>({
    method: 'GET',
    path: `/api/alerting/rules/_find?search=${encodeURIComponent(name)}&search_fields=name`,
    headers: { 'kbn-xsrf': 'scout' },
  });
  return res.data?.data?.find((r) => r.name === name)?.id;
};

const deleteRuleById = async (kbnClient: KbnClient, id: string) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/alerting/rule/${id}`,
    headers: { 'kbn-xsrf': 'scout' },
    ignoreErrors: [404],
  });
};

test.describe('Rules create flow', { tag: tags.stateful.classic }, () => {
  const createdRuleNames: string[] = [];

  test.beforeEach(async ({ browserAuth, page }) => {
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ kbnClient }) => {
    for (const name of createdRuleNames) {
      const id = await findRuleIdByName(kbnClient, name);
      if (id) await deleteRuleById(kbnClient, id);
    }
    createdRuleNames.length = 0;
  });

  test('opens the rule type modal and the rule form when a rule type is selected', async ({
    page,
  }) => {
    const createButton = page.testSubj.locator('createRuleButton');

    await test.step('the create rule button is visible and enabled', async () => {
      await expect(createButton).toBeVisible();
      await expect(createButton).toBeEnabled();
    });

    await test.step('clicking the create rule button opens the rule type modal', async () => {
      await createButton.click();
      await expect(page.testSubj.locator('ruleTypeModal')).toBeVisible();
    });

    await test.step('selecting a rule type navigates to the create form', async () => {
      // `.es-query` is built-in in Scout's stateful/classic config. The FTR
      // test used `test.noop` here, which is FTR-fixture-only.
      await page.testSubj.click('.es-query-SelectOption');
      await expect(page.testSubj.locator('ruleForm')).toBeVisible();
    });
  });

  test('creates a rule and displays it in the rules list', async ({ page }) => {
    const ruleName = `scout-create-flow-${Date.now()}`;
    createdRuleNames.push(ruleName);

    await defineIndexThresholdRule(page, ruleName);
    await page.testSubj.click('rulePageFooterSaveButton');

    const confirmButton = page.testSubj.locator('confirmModalConfirmButton');
    await confirmButton.click({ timeout: 3000 }).catch(() => {});

    await expect(page.testSubj.locator('euiToastHeader__title')).toContainText(
      `Created rule "${ruleName}"`
    );

    await page.gotoApp('rules');
    await expect(page.testSubj.locator('rulesList')).toBeVisible();
    await expect(page.testSubj.locator('rulesList').locator(`[title="${ruleName}"]`)).toBeVisible();
  });

  test('redirects to the rule details page after saving a new rule', async ({ page }) => {
    const ruleName = `scout-create-flow-redirect-${Date.now()}`;
    createdRuleNames.push(ruleName);

    await defineIndexThresholdRule(page, ruleName);
    await page.testSubj.click('rulePageFooterSaveButton');

    const confirmButton = page.testSubj.locator('confirmModalConfirmButton');
    await confirmButton.click({ timeout: 3000 }).catch(() => {});

    // After save Kibana redirects to the rule details page automatically.
    await expect(page.testSubj.locator('ruleDetailsTitle')).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/app/rules/rule/');
  });
});
