/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { test, RULES_V1_READ_ROLE, RULES_V1_AND_V2_READ_ROLE } from '../fixtures';

const RULES_URL_RE = /\/app\/management\/insightsAndAlerting\/triggersActions(\/|$|\?|#)/;

/*
 * With the `alerting:v2:enabled` advanced setting on, the classic Rules page
 * swaps its Rules/Logs tabs for V1/V2 rules tabs — but only for a viewer who
 * can read Alerting v2 rules. Lacking that privilege collapses the heading
 * tab bar to nothing.
 *
 * Logs itself is unaffected by this privilege check: once the flag is on,
 * Logs always moves from a tab into the "More" menu instead — that placement
 * is gated on the flag alone, not on any privilege (v2 rules or otherwise).
 * See `rules_page_logs_visibility.spec.ts` for the menu-item assertions.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
const ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH = '/api/kibana/global_settings/alerting:v2:enabled';

test.describe(
  'Rules page heading tabs - alerting v2 privileges',
  { tag: '@local-stateful-classic' },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'POST',
        path: ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        body: { value: true },
      });
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'DELETE',
        path: ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH,
        headers: { 'kbn-xsrf': 'scout' },
        ignoreErrors: [404],
      });
    });

    test('shows the V1 and V2 rules tabs when the user can read both surfaces', async ({
      page,
      browserAuth,
    }) => {
      await browserAuth.loginWithCustomRole(RULES_V1_AND_V2_READ_ROLE);
      await page.gotoApp('rules');
      await page.waitForURL(RULES_URL_RE);

      await expect(page.testSubj.locator('v1RulesTab')).toBeVisible();
      await expect(page.testSubj.locator('v2RulesTab')).toBeVisible();
      await expect(page.testSubj.locator('rulesTab')).toBeHidden();
      await expect(page.testSubj.locator('logsTab')).toBeHidden();
    });

    test('hides all heading tabs when the user cannot read Alerting v2 rules', async ({
      page,
      browserAuth,
    }) => {
      await browserAuth.loginWithCustomRole(RULES_V1_READ_ROLE);
      await page.gotoApp('rules');
      await page.waitForURL(RULES_URL_RE);

      await expect(page.testSubj.locator('v1RulesTab')).toBeHidden();
      await expect(page.testSubj.locator('v2RulesTab')).toBeHidden();
      await expect(page.testSubj.locator('rulesTab')).toBeHidden();
      await expect(page.testSubj.locator('logsTab')).toBeHidden();
      await expect(page.locator('[role="tab"]')).toHaveCount(0);
    });
  }
);
