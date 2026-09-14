/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { expect } from '@kbn/scout/ui';
import { test, ACTIONS_ONLY_ROLE, RULES_V1_AND_V2_READ_ROLE } from '../fixtures';

const RULES_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;
const LOGS_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions\/logs(\/|$|\?|#)/;

/*
 * `alerting:v2:enabled` is a *global* advanced setting, read via
 * `core.settings.globalClient` — the regular `uiSettings` fixture writes to
 * the per-space settings store instead, so it never takes effect. Toggle it
 * via the dedicated global-settings endpoint, as in
 * `rule_management_skill_gating.spec.ts`.
 */
const ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH = '/api/kibana/global_settings/alerting:v2:enabled';

const enableAlertingV2 = (kbnClient: KbnClient) =>
  kbnClient.request({
    method: 'POST',
    path: ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH,
    headers: { 'kbn-xsrf': 'scout' },
    body: { value: true },
  });

const disableAlertingV2 = (kbnClient: KbnClient) =>
  kbnClient.request({
    method: 'DELETE',
    path: ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH,
    headers: { 'kbn-xsrf': 'scout' },
    ignoreErrors: [404],
  });

test.describe('Rules page Logs visibility', { tag: '@local-stateful-classic' }, () => {
  test('hides the classic Logs tab when the user lacks rule-type read access', async ({
    page,
    browserAuth,
  }) => {
    await browserAuth.loginWithCustomRole(ACTIONS_ONLY_ROLE);
    await page.gotoApp('rules');
    await page.waitForURL(RULES_URL_RE);

    await expect(page.testSubj.locator('rulesTab')).toBeVisible();
    await expect(page.testSubj.locator('logsTab')).toBeHidden();
  });

  test('omits the Logs menu item when the user lacks rule-type read access', async ({
    page,
    browserAuth,
    kbnClient,
  }) => {
    await enableAlertingV2(kbnClient);
    try {
      await browserAuth.loginWithCustomRole(ACTIONS_ONLY_ROLE);
      await page.gotoApp('rules');
      await page.waitForURL(RULES_URL_RE);

      await page.testSubj.click('app-menu-overflow-button');
      await expect(page.testSubj.locator('rulesLogsLink')).toBeHidden();
    } finally {
      await disableAlertingV2(kbnClient);
    }
  });

  test('shows the Logs child page with its own heading, back button, no tabs, and no create button', async ({
    page,
    browserAuth,
    kbnClient,
  }) => {
    await enableAlertingV2(kbnClient);
    try {
      await browserAuth.loginWithCustomRole(RULES_V1_AND_V2_READ_ROLE);
      await page.gotoApp('rules');
      await page.waitForURL(RULES_URL_RE);

      await page.testSubj.click('app-menu-overflow-button');
      await page.testSubj.click('rulesLogsLink');
      await page.waitForURL(LOGS_URL_RE);

      await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.title)).toContainText('Logs');
      await expect(page.testSubj.locator(APP_HEADER_TEST_SUBJECTS.back)).toHaveAccessibleName(
        'Back to Rules'
      );
      await expect(page.testSubj.locator('v1RulesTab')).toBeHidden();
      await expect(page.testSubj.locator('v2RulesTab')).toBeHidden();
      await expect(page.testSubj.locator('createRuleButton')).toBeHidden();
    } finally {
      await disableAlertingV2(kbnClient);
    }
  });
});
