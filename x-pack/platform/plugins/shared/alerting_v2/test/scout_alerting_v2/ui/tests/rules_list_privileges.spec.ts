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
 * Covers the UI capability gating on the Rules list page (see PR that adopts
 * `UserCapabilities.canWrite('rules')`). Read-only users can view rules but
 * every write affordance (create, row selection, quick edit, actions menu,
 * bulk actions) is hidden and the enabled toggle is read-only.
 *
 * Custom-role auth (`browserAuth.loginWithCustomRole`) is not yet supported on
 * Elastic Cloud Hosted, so this suite only runs on local stateful (classic)
 * until ECH support lands.
 */
test.describe('Rules list - read/write privileges', { tag: '@local-stateful-classic' }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: 'scout-rules-privileges' } })
    );
    ruleId = rule.id;
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
  });

  test('editor sees every write affordance', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_ALL_ROLE);
    await pageObjects.rulesList.goto();
    await expect(pageObjects.rulesList.rulesListTable).toBeVisible();

    const { rulesList } = pageObjects;
    await expect(rulesList.createRuleButton).toBeVisible();
    await expect(rulesList.selectAllRulesOnPageCheckbox).toBeVisible();
    await expect(rulesList.rowCheckbox(ruleId)).toBeVisible();
    await expect(rulesList.quickEditButton(ruleId)).toBeVisible();
    await expect(rulesList.actionsMenuButton(ruleId)).toBeVisible();
    await expect(rulesList.enabledSwitch(ruleId)).toBeEnabled();
  });

  test('read-only user cannot access write affordances', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_RULES_READ_ROLE);
    await pageObjects.rulesList.goto();
    await expect(pageObjects.rulesList.rulesListTable).toBeVisible();

    const { rulesList } = pageObjects;

    await test.step('write affordances are hidden', async () => {
      await expect(rulesList.createRuleButton).toBeHidden();
      await expect(rulesList.selectAllRulesOnPageCheckbox).toHaveCount(0);
      await expect(rulesList.rowCheckbox(ruleId)).toHaveCount(0);
      await expect(rulesList.quickEditButton(ruleId)).toHaveCount(0);
      await expect(rulesList.actionsMenuButton(ruleId)).toHaveCount(0);
    });

    await test.step('the enabled toggle is read-only', async () => {
      await expect(rulesList.enabledSwitch(ruleId)).toBeVisible();
      await expect(rulesList.enabledSwitch(ruleId)).toBeDisabled();
    });

    await test.step('read-only affordances remain available', async () => {
      await expect(rulesList.ruleNameLink(ruleId)).toBeVisible();
      await expect(rulesList.expandRuleButton(ruleId)).toBeVisible();
    });
  });
});
