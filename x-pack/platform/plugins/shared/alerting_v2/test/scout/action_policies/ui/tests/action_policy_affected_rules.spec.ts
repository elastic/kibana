/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import {
  ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE,
  ALERTING_V2_ACTION_POLICIES_READ_ROLE,
  buildCreateActionPolicyData,
  buildCreateRuleData,
  test,
  testData,
} from '../fixtures';

const POLICY_NAME = 'scout-action-policy-affected-rules';
const POLICY_TAG = 'scout-affected-rules';
const MATCHING_RULE_NAME = 'scout-affected-rule';
const OTHER_RULE_NAME = 'scout-unaffected-rule';

/*
 * The Back navigation relies on EUI's managed flyout history, which the RTL suite
 * cannot exercise because the Jest EUI build has no flyout manager.
 */
test.describe('Action Policies - affected rules', { tag: testData.UI_TAG }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.rules.create(
      buildCreateRuleData({ metadata: { name: MATCHING_RULE_NAME, routing_tags: [POLICY_TAG] } })
    );
    await apiServices.alertingV2.rules.create(
      // Same value as a rule tag only: policies match on routing tags, so this rule is not affected.
      buildCreateRuleData({ metadata: { name: OTHER_RULE_NAME, tags: [POLICY_TAG] } })
    );
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: POLICY_NAME, matcher: { tags: [POLICY_TAG] } })
    );
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
  });

  test('navigates from the details flyout to the affected rules and back', async ({
    browserAuth,
    pageObjects,
  }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_ALL_AND_RULES_READ_ROLE);
    const { actionPoliciesList } = pageObjects;
    await actionPoliciesList.goto();
    await actionPoliciesList.openDetailsFlyout(POLICY_NAME);
    await expect(actionPoliciesList.detailsFlyout).toBeVisible();

    await test.step('the link opens the affected rules flyout with the matching rules', async () => {
      await actionPoliciesList.detailsFlyoutSeeAffectedRulesLink.click();

      await expect(actionPoliciesList.affectedRulesFlyout).toBeVisible();
      await expect(actionPoliciesList.affectedRulesFlyout).toContainText('Affected rules');
      await expect(actionPoliciesList.affectedRuleRow(MATCHING_RULE_NAME)).toBeVisible();
      await expect(actionPoliciesList.affectedRuleRow(OTHER_RULE_NAME)).toHaveCount(0);

      const openRuleLink = actionPoliciesList.affectedRuleOpenLink(MATCHING_RULE_NAME);
      await expect(openRuleLink).toHaveAttribute('target', '_blank');
      await expect(openRuleLink).toHaveAttribute('href', /ALERTING_V2_RULES_LOCATOR/);
    });

    await test.step('Back returns to the details flyout', async () => {
      await actionPoliciesList.affectedRulesBackButton.click();

      await expect(actionPoliciesList.affectedRulesFlyout).toHaveCount(0);
      await expect(actionPoliciesList.detailsFlyout).toBeVisible();
    });

    await test.step('closing the affected rules flyout also closes the details flyout', async () => {
      await actionPoliciesList.detailsFlyoutSeeAffectedRulesLink.click();
      await expect(actionPoliciesList.affectedRulesFlyout).toBeVisible();

      await actionPoliciesList.affectedRulesCloseButton.click();

      await expect(actionPoliciesList.affectedRulesFlyout).toHaveCount(0);
      await expect(actionPoliciesList.detailsFlyout).toHaveCount(0);
    });
  });

  test('hides the link from users who cannot read rules', async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginWithCustomRole(ALERTING_V2_ACTION_POLICIES_READ_ROLE);
    const { actionPoliciesList } = pageObjects;
    await actionPoliciesList.goto();
    await actionPoliciesList.openDetailsFlyout(POLICY_NAME);

    await expect(actionPoliciesList.detailsFlyout).toBeVisible();
    await expect(actionPoliciesList.detailsFlyoutSeeAffectedRulesLink).toHaveCount(0);
  });
});
