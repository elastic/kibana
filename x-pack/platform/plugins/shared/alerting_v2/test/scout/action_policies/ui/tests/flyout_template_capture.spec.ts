/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  buildCreateActionPolicyData,
  buildCreateRuleData,
  buildWorkflowYaml,
  test,
  testData,
} from '../fixtures';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const RUN_ID = '305245';
const ROUTING_TAG = `capture-routing-${RUN_ID}`;
const POLICY_NAME = `Capture on-call escalation ${RUN_ID}`;
const RULE_NAMES = [`Capture high CPU ${RUN_ID}`, `Capture disk pressure ${RUN_ID}`];

const waitForFlyout = async (flyout: Locator) => {
  await expect(flyout).toBeVisible({ timeout: 30_000 });
  await expect(flyout.getByRole('heading').first()).toBeVisible();
  await expect(flyout.locator('.euiLoadingSpinner')).toHaveCount(0, { timeout: 30_000 });
};

test.describe('Flyout template capture - alerting_v2', { tag: testData.UI_TAG }, () => {
  let workflowId: string;
  let policyId: string;
  const ruleIds: string[] = [];

  test.beforeAll(async ({ apiServices }) => {
    const workflow = await apiServices.alertingV2.workflows.create(
      buildWorkflowYaml(`Capture console notifier ${RUN_ID}`)
    );
    workflowId = workflow.id;
    for (const name of RULE_NAMES) {
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: {
            name,
            description: 'Fires when a host breaches its threshold.',
            tags: ['capture', 'infra'],
            routing_tags: [ROUTING_TAG],
          },
        })
      );
      ruleIds.push(rule.id);
    }
    const policy = await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({
        name: POLICY_NAME,
        description: 'Pages the on-call engineer for infrastructure alerts.',
        matcher: { tags: [ROUTING_TAG] },
        destinations: [{ type: 'workflow', id: workflowId }],
      })
    );
    policyId = policy.id;
  });

  test.afterAll(async ({ apiServices }) => {
    if (policyId) {
      await apiServices.alertingV2.actionPolicies.delete(policyId);
    }
    for (const id of ruleIds) {
      await apiServices.alertingV2.rules.delete(id);
    }
    if (workflowId) {
      await apiServices.alertingV2.workflows.bulkDelete([workflowId]);
    }
  });

  test('action policy flyouts', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    const { actionPoliciesList } = pageObjects;
    await actionPoliciesList.goto();
    await actionPoliciesList.search(POLICY_NAME);
    await actionPoliciesList.openDetailsFlyout(POLICY_NAME);

    const detailsFlyout = actionPoliciesList.detailsFlyout;
    await waitForFlyout(detailsFlyout);
    await capture(page, 'alerting-v2-01-action-policy-details');

    await actionPoliciesList.detailsFlyoutSeeAffectedRulesLink.click();
    const affectedRulesFlyout = actionPoliciesList.affectedRulesFlyout;
    await waitForFlyout(affectedRulesFlyout);
    await expect(actionPoliciesList.affectedRuleRow(RULE_NAMES[0])).toBeVisible({
      timeout: 30_000,
    });
    await capture(page, 'alerting-v2-02-affected-rules');

    await actionPoliciesList.affectedRulesBackButton.click();
    await expect(affectedRulesFlyout).toHaveCount(0);
    await waitForFlyout(detailsFlyout);

    await actionPoliciesList.detailsFlyoutTakeActionButton.click();
    await page.testSubj.locator(`sendTestNotificationActionPolicy-${policyId}`).click();
    const sendTestFlyout = page.testSubj.locator('sendTestNotificationFlyout');
    await waitForFlyout(sendTestFlyout);
    await expect(sendTestFlyout.getByTestId('sendTestNotificationPayloadEditor')).toBeVisible({
      timeout: 30_000,
    });
    await expect(sendTestFlyout.getByTestId('sendTestNotificationSendButton')).toBeEnabled();
    await capture(page, 'alerting-v2-04-send-test-notification');

    await sendTestFlyout.getByTestId('sendTestNotificationSendButton').click();
    const resultsFlyout = page.testSubj.locator('sendTestNotificationResultsFlyout');
    await waitForFlyout(resultsFlyout);
    await expect(resultsFlyout.getByTestId(`sendTestNotificationResult-${workflowId}`)).toBeVisible(
      { timeout: 30_000 }
    );
    await capture(page, 'alerting-v2-05-send-test-results');
  });

  test('rule summary flyout', async ({ browserAuth, page, pageObjects }) => {
    await browserAuth.loginAsAdmin();
    const { rulesList } = pageObjects;
    await rulesList.goto();
    await rulesList.ruleNameLink(ruleIds[0]).click();
    await waitForFlyout(rulesList.ruleSummaryFlyout);
    await capture(page, 'alerting-v2-03-rule-summary');
  });
});
