/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_RULES_ALL_ROLE,
  ALERTING_V2_RULES_READ_ROLE,
  buildCreateRuleData,
  test,
} from '../fixtures';

/*
 * Verifies that the server-side Kibana feature capability (alerting_v2_rules
 * `read` vs `all`) actually reaches the client and drives
 * `UserCapabilities.canWrite('rules')` on the Rules list page.
 */
test.describe(
  'Rules list - read/write privileges',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    let ruleId: string;
    const SUITE_TAG = `scout-privileges-${Date.now()}`;

    test.beforeAll(async ({ apiServices }) => {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'scout-rules-privileges', tags: [SUITE_TAG] },
        })
      );
      ruleId = rule.id;
    });

    test.afterAll(async ({ apiServices }) => {
      await apiServices.alertingV2.rules.delete(ruleId);
    });

    test('editor can create rules and toggle enabled', async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_ALL_ROLE);
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible();
      await pageObjects.rulesList.filterBySingleTag(SUITE_TAG);

      await expect(pageObjects.rulesList.createRuleButton).toBeVisible();
      await expect(pageObjects.rulesList.enabledSwitch(ruleId)).toBeEnabled();
    });

    test('read-only user cannot create rules or toggle enabled', async ({
      browserAuth,
      pageObjects,
    }) => {
      await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE);
      await pageObjects.rulesList.goto();
      await expect(pageObjects.rulesList.rulesListTable).toBeVisible();
      await pageObjects.rulesList.filterBySingleTag(SUITE_TAG);

      await expect(pageObjects.rulesList.createRuleButton).toBeHidden();
      // Read-only users get a status badge instead of a toggle, so the switch is never rendered.
      await expect(pageObjects.rulesList.enabledSwitch(ruleId)).toBeHidden();
      await expect(pageObjects.rulesList.enabledBadge(ruleId)).toBeVisible();
    });
  }
);
