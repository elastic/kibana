/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SETTINGS_LINK_SUBJ = 'rulesSettingsLink';
const PAGE_SUBJ = 'rulesSettingsPage';
const FLAPPING_OFF_PROMPT_SUBJ = 'rulesSettingsFlappingOffPrompt';
const FLAPPING_TOGGLE_SUBJ = 'rulesSettingsFlappingEnableSwitch';
const LOOK_BACK_INPUT_SUBJ = 'lookBackWindowRangeInput';
const STATUS_CHANGE_INPUT_SUBJ = 'statusChangeThresholdRangeInput';

const DEFAULT_LOOK_BACK = 10;
const DEFAULT_STATUS_CHANGE_THRESHOLD = 10;

const openRulesSettingsPage = async (page: ScoutPage) => {
  await page.testSubj.click(SETTINGS_LINK_SUBJ);

  const settingsPage = page.testSubj.locator(PAGE_SUBJ);
  await expect(settingsPage).toBeVisible();

  // Wait for the settings controls rather than the generic `centerJustifiedSpinner`.
  await expect(settingsPage.getByTestId(FLAPPING_TOGGLE_SUBJ)).toBeVisible();

  return settingsPage;
};

test.describe('Rules settings page', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, apiServices, page }) => {
    await apiServices.alerting.settings.reset();
    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ apiServices }) => {
    await apiServices.alerting.settings.reset();
  });

  test('opens, shows configured values, and persists changes', async ({ page }) => {
    await test.step('the rules settings link is enabled', async () => {
      const link = page.testSubj.locator(SETTINGS_LINK_SUBJ);
      await expect(link).toBeVisible();
      await expect(link).toBeEnabled();
    });

    await test.step('opens the settings page with the configured values', async () => {
      const settingsPage = await openRulesSettingsPage(page);

      await expect(settingsPage.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeHidden();
      await expect(settingsPage.getByTestId(FLAPPING_TOGGLE_SUBJ)).toBeVisible();
      await expect(settingsPage.getByTestId(LOOK_BACK_INPUT_SUBJ)).toHaveValue(
        String(DEFAULT_LOOK_BACK)
      );
      await expect(settingsPage.getByTestId(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
        String(DEFAULT_STATUS_CHANGE_THRESHOLD)
      );

      // Query-delay UI is gated behind a feature flag that is not on in
      // the Scout stateful/classic config.
      await expect(settingsPage.getByTestId('queryDelayRangeInput')).toBeHidden();
    });

    await test.step('modifies the rules settings and persists them', async () => {
      const settingsPage = page.testSubj.locator(PAGE_SUBJ);
      const lookBackInput = settingsPage.getByTestId(LOOK_BACK_INPUT_SUBJ);
      const statusChangeInput = settingsPage.getByTestId(STATUS_CHANGE_INPUT_SUBJ);

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

      await settingsPage.getByTestId(FLAPPING_TOGGLE_SUBJ).click();
      await expect(settingsPage.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();

      await page.testSubj.click('rulesSettingsPageSaveButton');
      await expect(settingsPage).toBeHidden();

      const reopenedPage = await openRulesSettingsPage(page);

      await expect(reopenedPage.getByTestId(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();
      await reopenedPage.getByTestId(FLAPPING_TOGGLE_SUBJ).click();

      await expect(reopenedPage.getByTestId(LOOK_BACK_INPUT_SUBJ)).toHaveValue(
        String(DEFAULT_LOOK_BACK + 5)
      );
      await expect(reopenedPage.getByTestId(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
        String(DEFAULT_STATUS_CHANGE_THRESHOLD - 5)
      );
    });
  });
});
