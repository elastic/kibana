/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';

const SETTINGS_LINK_SUBJ = 'rulesSettingsLink';
const FLYOUT_SUBJ = 'rulesSettingsFlyout';
const FLAPPING_OFF_PROMPT_SUBJ = 'rulesSettingsFlappingOffPrompt';
const FLAPPING_TOGGLE_SUBJ = 'rulesSettingsFlappingEnableSwitch';
const LOOK_BACK_INPUT_SUBJ = 'lookBackWindowRangeInput';
const STATUS_CHANGE_INPUT_SUBJ = 'statusChangeThresholdRangeInput';
const SPINNER_SUBJ = 'centerJustifiedSpinner';

const DEFAULT_LOOK_BACK = 10;
const DEFAULT_STATUS_CHANGE_THRESHOLD = 10;
const DEFAULT_QUERY_DELAY = 10;

// `.es-query` is built-in (the FTR `getTestAlertData()` uses `test.noop`,
// which Scout's stateful/classic does not register). The rule's only purpose
// is to get the rules list to render — see FTR's `refreshAlertsList`.
const makeEsQueryRule = () => ({
  name: `scout-rules-settings-rule-${Date.now()}`,
  ruleTypeId: '.es-query',
  consumer: 'stackAlerts',
  params: {
    searchType: 'esQuery' as const,
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    threshold: [0],
    thresholdComparator: '>',
    size: 100,
    esQuery: '{"query":{"match_all":{}}}',
    aggType: 'count',
    groupBy: 'all',
    termSize: 5,
    excludeHitsFromPreviousRun: false,
    sourceFields: [],
    index: ['.kibana'],
    timeField: '@timestamp',
  },
  schedule: { interval: '1m' },
  tags: ['scout-rules-settings'],
});

test.describe('Rules settings flyout', { tag: tags.stateful.classic }, () => {
  let createdRuleId: string | undefined;

  // Runs before every test so each one starts from the same known
  // settings + a populated rules list. The original FTR spec set this in a
  // single `before` hook; tests would be order-dependent because test 3
  // mutates flapping settings — moving to beforeEach makes them isolated.
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

    const response = await apiServices.alerting.rules.create(makeEsQueryRule());
    createdRuleId = response.data.id;

    await browserAuth.loginAsAdmin();
    await page.gotoApp('rules');
  });

  test.afterEach(async ({ apiServices }) => {
    if (createdRuleId) {
      await apiServices.alerting.rules.delete(createdRuleId);
      createdRuleId = undefined;
    }
  });

  test('the rules settings link is enabled', async ({ page }) => {
    const link = page.testSubj.locator(SETTINGS_LINK_SUBJ);
    await expect(link).toBeVisible();
    await expect(link).toBeEnabled();
  });

  test('opens the rules settings flyout with the configured values', async ({ page }) => {
    await page.testSubj.click(SETTINGS_LINK_SUBJ);
    await expect(page.testSubj.locator(FLYOUT_SUBJ)).toBeVisible();
    await expect(page.testSubj.locator(SPINNER_SUBJ)).toBeHidden();

    // Flapping is enabled, so the "off" prompt is hidden and the inputs are
    // shown at the configured values.
    await expect(page.testSubj.locator(FLAPPING_OFF_PROMPT_SUBJ)).toBeHidden();
    await expect(page.testSubj.locator(FLAPPING_TOGGLE_SUBJ)).toBeVisible();
    await expect(page.testSubj.locator(LOOK_BACK_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_LOOK_BACK)
    );
    await expect(page.testSubj.locator(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_STATUS_CHANGE_THRESHOLD)
    );

    // Query-delay UI is gated behind a feature flag that is not on in
    // the Scout stateful/classic config (and was disabled in the original
    // FTR spec for the same reason).
    await expect(page.testSubj.locator('queryDelayRangeInput')).toBeHidden();
  });

  test('modifies the rules settings and persists them', async ({ page }) => {
    await page.testSubj.click(SETTINGS_LINK_SUBJ);
    await expect(page.testSubj.locator(SPINNER_SUBJ)).toBeHidden();

    const lookBackInput = page.testSubj.locator(LOOK_BACK_INPUT_SUBJ);
    const statusChangeInput = page.testSubj.locator(STATUS_CHANGE_INPUT_SUBJ);

    // EUI range inputs accept arrow keys to step the value. The original FTR
    // spec drove this with `browser.pressKeys`. Each press shifts by one step.
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
    await page.testSubj.click(FLAPPING_TOGGLE_SUBJ);
    await expect(page.testSubj.locator(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();

    // Save and verify the flyout closes
    await page.testSubj.click('rulesSettingsFlyoutSaveButton');
    await expect(page.testSubj.locator(FLYOUT_SUBJ)).toBeHidden();

    // Reopen and confirm the new values were persisted
    await page.testSubj.click(SETTINGS_LINK_SUBJ);
    await expect(page.testSubj.locator(SPINNER_SUBJ)).toBeHidden();

    // Flapping was just turned off, so the off-prompt is shown — flip it
    // back on so the inputs are visible to assert against.
    await expect(page.testSubj.locator(FLAPPING_OFF_PROMPT_SUBJ)).toBeVisible();
    await page.testSubj.click(FLAPPING_TOGGLE_SUBJ);

    await expect(page.testSubj.locator(LOOK_BACK_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_LOOK_BACK + 5)
    );
    await expect(page.testSubj.locator(STATUS_CHANGE_INPUT_SUBJ)).toHaveValue(
      String(DEFAULT_STATUS_CHANGE_THRESHOLD - 5)
    );
  });
});
