/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import { createIndexThresholdRule } from '../fixtures/generators';
import { getAlertsAndActionsRole, getOnlyActionsRole } from '../fixtures/roles';

test.describe('Rules home page', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.afterAll(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId).catch(() => {});
    }
  });

  test('loads the Rules page heading with stack alerts + actions privileges', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getAlertsAndActionsRole());
    await pageObjects.rulesListPage.goto();
    await expect(pageObjects.rulesListPage.appTitle).toHaveText('Rules');
  });

  test('shows the no-permission prompt with only actions privilege', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(getOnlyActionsRole());
    await page.gotoApp('rules');
    await expect(pageObjects.rulesListPage.noPermissionPrompt).toBeVisible();
  });

  test('loads the Rules page heading as admin', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    await pageObjects.rulesListPage.goto();
    await expect(pageObjects.rulesListPage.appTitle).toHaveText('Rules');
  });

  test('renders the rules list and navigates to a rule details page', async ({
    apiServices,
    browserAuth,
    page,
    pageObjects,
  }) => {
    await browserAuth.loginAsAdmin();

    const ruleName = `Scout Home Page Test ${Date.now()}`;
    const rule = await createIndexThresholdRule(apiServices, { name: ruleName });
    createdRuleId = rule.id;

    await pageObjects.rulesListPage.goto();
    await expect(pageObjects.rulesListPage.rulesList).toBeVisible();

    await pageObjects.rulesListPage.clickRuleByName(ruleName);
    await expect(page).toHaveURL(new RegExp(`/rule/${rule.id}`));
  });
});
