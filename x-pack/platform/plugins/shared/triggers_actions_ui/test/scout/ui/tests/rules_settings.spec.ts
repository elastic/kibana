/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test, makeEsQueryRule } from '../fixtures';

const SETTINGS_LINK_SUBJ = 'rulesSettingsLink';
const FLYOUT_SUBJ = 'rulesSettingsFlyout';
const FLAPPING_OFF_PROMPT_SUBJ = 'rulesSettingsFlappingOffPrompt';
const FLAPPING_TOGGLE_SUBJ = 'rulesSettingsFlappingEnableSwitch';
const LOOK_BACK_INPUT_SUBJ = 'lookBackWindowRangeInput';
const STATUS_CHANGE_INPUT_SUBJ = 'statusChangeThresholdRangeInput';

const DEFAULT_LOOK_BACK = 10;
const DEFAULT_STATUS_CHANGE_THRESHOLD = 10;
const DEFAULT_QUERY_DELAY = 10;

const openRulesSettingsFlyout = async (page: ScoutPage) => {
  await page.testSubj.click(SETTINGS_LINK_SUBJ);

  const flyout = page.testSubj.locator(FLYOUT_SUBJ);
  await expect(flyout).toBeVisible();

  // Wait for the flyout's settings controls rather than the generic
  // `centerJustifiedSpinner`, which also exists in the underlying rules list.
  await expect(flyout.getByTestId(FLAPPING_TOGGLE_SUBJ)).toBeVisible();

  return flyout;
};

test.describe('Rules settings flyout', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  test.beforeEach(async ({ apiServices, browserAuth, kbnClient, page }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_flapping',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        enabled: true,
        look_back_window: DEFAULT_LOOK_BACK,
        status_change_threshold: DEFAULT_STATUS_CHANGE_THRESHOLD,
      },
    });
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_query_delay',
      headers: { 'kbn-xsrf': 'scout' },
      body: { delay: DEFAULT_QUERY_DELAY },
    });

    const response = await apiServices.alerting.rules.create(
      makeEsQueryRule('scout-rules-settings')
    );
    createdRuleId = response.data.id;

    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ apiServices, kbnClient }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
      createdRuleId = undefined;
    }
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_flapping',
      headers: { 'kbn-xsrf': 'scout' },
      body: {
        enabled: true,
        look_back_window: DEFAULT_LOOK_BACK,
        status_change_threshold: DEFAULT_STATUS_CHANGE_THRESHOLD,
      },
    });
    await kbnClient.request({
      method: 'POST',
      path: '/internal/alerting/rules/settings/_query_delay',
      headers: { 'kbn-xsrf': 'scout' },
      body: { delay: DEFAULT_QUERY_DELAY },
    });
  });

  test('the rules settings link is enabled', async ({ page }) => {
    const link = page.testSubj.locator(SETTINGS_LINK_SUBJ);
    await expect(link).toBeVisible();
    await expect(link).toBeEnabled();
  });

  test('opens the rules settings flyout with the configured values', async ({ page }) => {
    const flyout = await openRulesSettingsFlyout(page);

    // Flapping is enabled, so the "off" prompt is hidden and the inputs are
    // shown at the configured values.
    await expect(flyout.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeHidden();
    await expect(flyout.getByTestId(FLAPPING_TOGGLE_SUBJ)).toBeVisible();
    await expect(flyout.getByTestId(LOOK_BACK_INPUT_SUBJ)).toHaveValue(String(DEFAULT_LOOK_BACK));
    await expect(flyout.getByTestId(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_STATUS_CHANGE_THRESHOLD)
    );

    // Query-delay UI is gated behind a feature flag that is not on in
    // the Scout stateful/classic config.
    await expect(flyout.getByTestId('queryDelayRangeInput')).toBeHidden();
  });

  test('modifies the rules settings and persists them', async ({ page }) => {
    const flyout = await openRulesSettingsFlyout(page);

    const lookBackInput = flyout.getByTestId(LOOK_BACK_INPUT_SUBJ);
    const statusChangeInput = flyout.getByTestId(STATUS_CHANGE_INPUT_SUBJ);

    // EUI range inputs accept arrow keys to step the value.
    await lookBackInput.focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
    }
    await statusChangeInput.focus();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft');
    }

    await expect(lookBackInput).toHaveValue(String(DEFAULT_LOOK_BACK + 5));
    await expect(statusChangeInput).toHaveValue(String(DEFAULT_STATUS_CHANGE_THRESHOLD - 5));

    // Disable flapping
    await flyout.getByTestId(FLAPPING_TOGGLE_SUBJ).click();
    await expect(flyout.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();

    // Save and verify the flyout closes
    await page.testSubj.click('rulesSettingsFlyoutSaveButton');
    await expect(flyout).toBeHidden();

    // Reopen and confirm the new values were persisted
    const reopenedFlyout = await openRulesSettingsFlyout(page);

    // Flapping was just turned off, so the off-prompt is shown — flip it
    // back on so the inputs are visible to assert against.
    await expect(reopenedFlyout.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();
    await reopenedFlyout.getByTestId(FLAPPING_TOGGLE_SUBJ).click();

    await expect(reopenedFlyout.getByTestId(LOOK_BACK_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_LOOK_BACK + 5)
    );
    await expect(reopenedFlyout.getByTestId(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_STATUS_CHANGE_THRESHOLD - 5)
    );
  });
});
