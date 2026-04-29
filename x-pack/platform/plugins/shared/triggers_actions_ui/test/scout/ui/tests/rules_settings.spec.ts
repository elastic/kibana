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

test.describe('Rules settings flyout', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_flapping',
      body: { enabled: true, look_back_window: 10, status_change_threshold: 10 },
    });
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_query_delay',
      body: { delay: 10 },
    });
  });

  test.beforeEach(async ({ apiServices, browserAuth, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    const rule = await createIndexThresholdRule(apiServices, {
      name: `Scout Settings Test ${Date.now()}`,
    });
    createdRuleId = rule.id;
    await pageObjects.rulesListPage.goto();
    await expect(pageObjects.rulesListPage.rulesList).toBeVisible();
  });

  test.afterEach(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId).catch(() => {});
      createdRuleId = undefined;
    }
  });

  test('rules settings link should be enabled', async ({ pageObjects }) => {
    await expect(pageObjects.rulesSettingsPage.settingsLink).toBeVisible();
    await expect(pageObjects.rulesSettingsPage.settingsLink).toBeEnabled();
  });

  test('opens the rules settings flyout with seeded values', async ({ pageObjects }) => {
    await pageObjects.rulesSettingsPage.open();

    // Flapping enabled by default → off-prompt should be hidden
    await expect(pageObjects.rulesSettingsPage.flappingOffPrompt).toBeHidden();

    await expect(pageObjects.rulesSettingsPage.flappingEnableSwitch).toBeVisible();
    await expect(pageObjects.rulesSettingsPage.lookBackWindowInput).toBeVisible();
    await expect(pageObjects.rulesSettingsPage.statusChangeThresholdInput).toBeVisible();

    // Query delay range input is gated on a feature flag and should be hidden by default.
    await expect(pageObjects.rulesSettingsPage.queryDelayInput).toBeHidden();

    await expect(pageObjects.rulesSettingsPage.lookBackWindowInput).toHaveValue('10');
    await expect(pageObjects.rulesSettingsPage.statusChangeThresholdInput).toHaveValue('10');
  });

  test('modifies and persists rules settings', async ({ pageObjects }) => {
    await pageObjects.rulesSettingsPage.open();

    await pageObjects.rulesSettingsPage.dragRangeInput(
      pageObjects.rulesSettingsPage.lookBackWindowInput,
      5,
      'right'
    );
    await pageObjects.rulesSettingsPage.dragRangeInput(
      pageObjects.rulesSettingsPage.statusChangeThresholdInput,
      5,
      'left'
    );

    await expect(pageObjects.rulesSettingsPage.lookBackWindowInput).toHaveValue('15');
    await expect(pageObjects.rulesSettingsPage.statusChangeThresholdInput).toHaveValue('5');

    await pageObjects.rulesSettingsPage.flappingEnableSwitch.click();
    await expect(pageObjects.rulesSettingsPage.flappingOffPrompt).toBeVisible();

    await pageObjects.rulesSettingsPage.save();

    // Reopen and verify persistence
    await pageObjects.rulesSettingsPage.open();
    await expect(pageObjects.rulesSettingsPage.flappingOffPrompt).toBeVisible();
    await pageObjects.rulesSettingsPage.flappingEnableSwitch.click();

    await expect(pageObjects.rulesSettingsPage.lookBackWindowInput).toHaveValue('15');
    await expect(pageObjects.rulesSettingsPage.statusChangeThresholdInput).toHaveValue('5');
  });
});
