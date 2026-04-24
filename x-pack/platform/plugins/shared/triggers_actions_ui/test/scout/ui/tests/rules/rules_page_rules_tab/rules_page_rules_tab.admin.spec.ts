/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../../../fixtures';
import { BIGGER_TIMEOUT } from '../../../fixtures/constants';
import { getRuleIdByName } from '../../../fixtures/helpers';
import { RULE_NAMES, seedRulesForTests } from '../../../fixtures/rule_seeding';

test.describe(
  'Rules Page - Rules Tab - Admin',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ apiServices }) => {
      await seedRulesForTests(apiServices);
    });

    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.rulesPage.goto();
    });

    test.afterEach(async ({ apiServices }) => {
      const ruleId = await getRuleIdByName(apiServices, RULE_NAMES.FIRST_RULE_TEST);
      if (ruleId) {
        await apiServices.alerting.rules.enable(ruleId).catch(() => {});
      }
    });

    test.afterAll(async ({ apiServices }) => {
      for (const name of Object.values(RULE_NAMES)) {
        const id = await getRuleIdByName(apiServices, name);
        if (id) {
          await apiServices.alerting.rules.delete(id).catch(() => {});
        }
      }
    });

    test('should see the Rules Table container', async ({ pageObjects }) => {
      await expect(pageObjects.rulesPage.rulesTableContainer).toBeVisible();
    });

    test('should see an editable rule in the Rules Table', async ({ pageObjects }) => {
      await expect(pageObjects.rulesPage.ruleSearchField).toBeVisible();
      const editableRules = pageObjects.rulesPage.getEditableRules();
      await expect(editableRules.filter({ hasText: RULE_NAMES.FIRST_RULE_TEST })).toHaveCount(1);
    });

    test('should show the edit action button and navigate to the edit rule page', async ({
      page,
      pageObjects,
    }) => {
      const ruleRow = pageObjects.rulesPage.getRuleRowByName(RULE_NAMES.FIRST_RULE_TEST);
      await expect(ruleRow).toBeVisible();
      await ruleRow.hover();

      const editActionContainer = pageObjects.rulesPage.getRuleSidebarEditAction(ruleRow);
      await expect(editActionContainer).toBeVisible();

      const editButton = pageObjects.rulesPage.getEditActionButton(ruleRow);
      await expect(editButton).toBeVisible();

      await editButton.click();

      // Unified rules navigates to a dedicated edit page instead of opening a flyout.
      await expect(page).toHaveURL(/\/app\/rules\/edit\//, { timeout: BIGGER_TIMEOUT });
      await expect(pageObjects.ruleDetailsPage.ruleNameInput).toBeVisible({
        timeout: BIGGER_TIMEOUT,
      });
    });

    test('changes the rule status to "disabled"', async ({ apiServices, pageObjects, page }) => {
      const ruleId = await getRuleIdByName(apiServices, RULE_NAMES.FIRST_RULE_TEST);
      expect(ruleId, `Rule "${RULE_NAMES.FIRST_RULE_TEST}" not found`).toBeDefined();
      await apiServices.alerting.rules.enable(ruleId!);

      await page.reload();
      await pageObjects.rulesPage.expectRuleToBeEnabled(RULE_NAMES.FIRST_RULE_TEST);

      await test.step('disable the rule via the status dropdown', async () => {
        await expect(pageObjects.rulesPage.rulesTable).toBeVisible();
        await pageObjects.rulesPage.clickRuleStatusDropDownMenu(RULE_NAMES.FIRST_RULE_TEST);
        await pageObjects.rulesPage.clickDisableFromDropDownMenu();

        await expect(pageObjects.rulesPage.confirmModalButton).toBeVisible();
        await pageObjects.rulesPage.confirmModalButton.click();

        await pageObjects.rulesPage.expectRuleToBeDisabled(RULE_NAMES.FIRST_RULE_TEST);
      });
    });
  }
);
