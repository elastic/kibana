/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_RULES_READ_ROLE,
  ALERTING_V2_RULES_READ_AND_V1_READ_ROLE,
  test,
} from '../fixtures';

/*
 * The Rules list heading swaps its single "V2 rules" tab for a V1/V2 pair
 * once the viewer can also read the classic (v1) Rules page — but lacking
 * that v1 capability collapses the heading tab bar to nothing, rather than
 * showing the V2 tab alone.
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
/*
 * `alerting:v2:enabled` is a *global* advanced setting, read via
 * `core.settings.globalClient`. This config root normally pins it on via a
 * server-arg override, but set it explicitly too so this spec is correct
 * regardless of which config it runs under.
 */
const ALERTING_V2_ENABLED_GLOBAL_SETTING_PATH = '/api/kibana/global_settings/alerting:v2:enabled';

test.describe('Rules list - heading tabs privileges', { tag: '@local-stateful-classic' }, () => {
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
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_AND_V1_READ_ROLE);
    await pageObjects.rulesList.goto();

    await expect(pageObjects.rulesList.v1RulesTab).toBeVisible();
    await expect(pageObjects.rulesList.v2RulesTab).toBeVisible();
  });

  test('hides the tab strip when the user cannot read the v1 Rules page', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE);
    await pageObjects.rulesList.goto();

    await expect(pageObjects.rulesList.v1RulesTab).toBeHidden();
    await expect(pageObjects.rulesList.v2RulesTab).toBeHidden();
  });
});
