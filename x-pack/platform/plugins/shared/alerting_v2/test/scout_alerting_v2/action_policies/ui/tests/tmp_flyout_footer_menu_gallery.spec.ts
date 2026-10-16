/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TEMP — delete before merge. Capture harness for the footer menu migration's before/after
// screenshots, not a test suite.

import Path from 'path';
import { expect } from '@kbn/scout/ui';
import { buildCreateActionPolicyData, buildCreateRuleData, test } from '../fixtures';

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
// Run from the repo root so this lands in the repo's gitignored .playwright-mcp/.
const OUT_DIR = Path.resolve('.playwright-mcp/flyout-migration', RUN);
const POLICY_NAME = 'gallery-action-policy';
const POLICY_TAG = 'gallery-tag';
const RULE_NAME = 'gallery-rule';

test.describe('TEMP footer menu gallery', { tag: '@local-stateful-classic' }, () => {
  let ruleId: string;

  test.beforeAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: RULE_NAME, tags: [POLICY_TAG] },
        // The default Scout server config enforces a 1m minimum, unlike the alerting_v2 config set.
        schedule: { every: '1m', lookback: '1m' },
      })
    );
    ruleId = rule.id;
    await apiServices.alertingV2.actionPolicies.create(
      buildCreateActionPolicyData({ name: POLICY_NAME, matcher: { tags: [POLICY_TAG] } })
    );
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.actionPolicies.cleanUp();
    await apiServices.alertingV2.rules.cleanUp();
  });

  test('captures the alerting_v2 flyout footer menus', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1600, height: 1000 });
    await browserAuth.loginAsAdmin();
    const { actionPoliciesList, executionHistory } = pageObjects;

    const shot = (name: string) =>
      page.screenshot({ path: Path.join(OUT_DIR, `${name}.png`), animations: 'disabled' });
    const dismissToasts = async () => {
      for (const close of await page.testSubj.locator('toastCloseButton').all()) {
        await close.click();
      }
    };

    await test.step('action policy flyout, menu closed', async () => {
      await actionPoliciesList.goto();
      await actionPoliciesList.openDetailsFlyout(POLICY_NAME);
      await expect(actionPoliciesList.detailsFlyout).toBeVisible();
      await page.waitForTimeout(1500);
      await dismissToasts();
      await shot('01-action-policy-flyout');
    });

    await test.step('action policy flyout, menu open', async () => {
      await page.testSubj.click('detailsFlyoutTakeActionButton');
      await expect(page.locator('[data-test-subj^="editActionPolicy-"]')).toBeVisible();
      await shot('02-action-policy-menu-open');
    });

    await test.step('action policy snooze modal', async () => {
      await page.locator('[data-test-subj^="snoozeActionPolicy-"]').click();
      await expect(page.testSubj.locator('actionPolicySnoozeModal')).toBeVisible();
      await shot('03-action-policy-snooze-modal');
      await page.keyboard.press('Escape');
      await expect(page.testSubj.locator('actionPolicySnoozeModal')).toHaveCount(0);
    });

    await test.step('affected rules child flyout', async () => {
      await actionPoliciesList.detailsFlyoutSeeAffectedRulesLink.click();
      await expect(actionPoliciesList.affectedRulesFlyout).toBeVisible();
      await page.waitForTimeout(1000);
      await shot('04-affected-rules-flyout');
    });

    await test.step('rule summary flyout, menu closed', async () => {
      const ruleLink = page.testSubj.locator(`ruleExecutionHistoryRuleLink-${ruleId}`).first();
      await expect(async () => {
        await executionHistory.goto();
        await expect(ruleLink).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 90_000 });
      await ruleLink.click();
      await expect(page.testSubj.locator('ruleSummaryFlyoutTakeActionButton')).toBeVisible();
      await page.waitForTimeout(1500);
      await dismissToasts();
      await shot('05-rule-summary-flyout');
    });

    await test.step('rule summary flyout, menu open', async () => {
      await page.testSubj.click('ruleSummaryFlyoutTakeActionButton');
      await expect(page.locator(`[data-test-subj="deleteRule-${ruleId}"]`)).toBeVisible();
      await shot('06-rule-summary-menu-open');
    });
  });
});
