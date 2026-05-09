/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { buildCreateRuleData, test } from '../fixtures';

test.describe('Quick edit rule flyout', { tag: '@local-stateful-classic' }, () => {
  let ruleId: string;
  const ruleName = 'scout-quick-edit-rule';
  const updatedName = 'scout-quick-edit-updated';

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: ruleName } })
    );
    ruleId = rule.id;
  });

  test.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsAlertingV2Editor();
    await pageObjects.rulesList.goto();
    await expect(pageObjects.rulesList.rulesListTable).toBeVisible({ timeout: 60_000 });
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  test('opens the quick edit flyout from the table pencil icon', async ({ page, pageObjects }) => {
    await test.step('click the pencil icon in the actions column', async () => {
      await pageObjects.rulesList.quickEditButton(ruleId).click();
    });

    await test.step('quick edit flyout is visible with the rule name populated', async () => {
      await expect(pageObjects.rulesList.quickEditFlyout).toBeVisible();
      await expect(pageObjects.rulesList.quickEditNameInput).toHaveValue(ruleName);
    });

    await test.step('quick edit flyout passes a11y checks', async () => {
      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="quickEditRuleFlyout"]'],
      });
      expect(violations).toHaveLength(0);
    });

    await test.step('close the flyout', async () => {
      await pageObjects.rulesList.quickEditCloseButton.click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeHidden();
    });
  });

  test('opens the quick edit flyout from the rule summary flyout', async ({ pageObjects }) => {
    await test.step('open the rule summary flyout by clicking the expand button', async () => {
      await pageObjects.rulesList.expandRuleButton(ruleId).click();
      await expect(pageObjects.rulesList.ruleSummaryFlyout).toBeVisible();
    });

    await test.step('click the pencil icon in the summary flyout header', async () => {
      await pageObjects.rulesList.ruleSummaryQuickEditButton.click();
    });

    await test.step('summary flyout closes and quick edit flyout opens', async () => {
      await expect(pageObjects.rulesList.ruleSummaryFlyout).toBeHidden();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeVisible();
      await expect(pageObjects.rulesList.quickEditNameInput).toHaveValue(ruleName);
    });

    await test.step('close the flyout', async () => {
      await pageObjects.rulesList.quickEditCancelButton.click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeHidden();
    });
  });

  test('edits a rule name and persists the change', async ({ pageObjects, apiServices }) => {
    await test.step('open quick edit and change the rule name', async () => {
      await pageObjects.rulesList.quickEditButton(ruleId).click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeVisible();
      await pageObjects.rulesList.quickEditNameInput.fill(updatedName);
    });

    await test.step('submit the form', async () => {
      await pageObjects.rulesList.quickEditSubmitButton.click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeHidden({ timeout: 30_000 });
    });

    await test.step('verify the rule name was updated via API', async () => {
      await expect
        .poll(
          async () => {
            const rule = await apiServices.alertingV2.rules.get(ruleId);
            return rule.metadata?.name;
          },
          { timeout: 30_000 }
        )
        .toBe(updatedName);
    });
  });

  test('cancel discards changes', async ({ pageObjects, apiServices }) => {
    const currentName = (await apiServices.alertingV2.rules.get(ruleId)).metadata?.name;

    await test.step('open quick edit, change the name, then cancel', async () => {
      await pageObjects.rulesList.quickEditButton(ruleId).click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeVisible();
      await pageObjects.rulesList.quickEditNameInput.fill('should-not-persist');
      await pageObjects.rulesList.quickEditCancelButton.click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeHidden();
    });

    await test.step('verify the rule name was not changed', async () => {
      const rule = await apiServices.alertingV2.rules.get(ruleId);
      expect(rule.metadata?.name).toBe(currentName);
    });
  });

  test('opening the summary flyout closes the quick edit flyout', async ({ pageObjects }) => {
    await test.step('open the quick edit flyout', async () => {
      await pageObjects.rulesList.quickEditButton(ruleId).click();
      await expect(pageObjects.rulesList.quickEditFlyout).toBeVisible();
    });

    await test.step('click the expand button to open the summary flyout', async () => {
      await pageObjects.rulesList.expandRuleButton(ruleId).click();
    });

    await test.step('quick edit closes and summary flyout opens', async () => {
      await expect(pageObjects.rulesList.quickEditFlyout).toBeHidden();
      await expect(pageObjects.rulesList.ruleSummaryFlyout).toBeVisible();
    });
  });
});
