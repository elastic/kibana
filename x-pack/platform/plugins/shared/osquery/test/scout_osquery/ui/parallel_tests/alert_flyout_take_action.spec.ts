/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import {
  buildOsqueryAlertTestRule,
  createDetectionRule,
  deleteDetectionRule,
} from '../helpers/detection_rule_lifecycle';
import { getFirstOnlineAgent } from '../helpers/fleet_agents';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Alert flyout take action and investigation guide', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;
  // Track test-local rules seeded by individual tests (e.g. the "persists IG
  // suggestions" test seeds its own rule to stay ordering-independent).
  const transientRuleIds: string[] = [];

  test.beforeAll(async ({ kbnClient }) => {
    const rule = buildOsqueryAlertTestRule({ includeResponseActions: false });
    const created = await createDetectionRule(kbnClient, rule);
    ruleId = created.id;
    ruleName = created.name;
    await bootstrapSecurityAlertsIndex(kbnClient);
  });

  test.afterEach(async ({ kbnClient }) => {
    // Drain any test-local rule seeds from this test's run.
    while (transientRuleIds.length > 0) {
      const id = transientRuleIds.pop();
      if (id) await deleteDetectionRule(kbnClient, id);
    }
  });

  test.afterAll(async ({ esClient, kbnClient, log }) => {
    await deleteSeededAlerts(esClient, ruleId).catch((err: Error) =>
      log.debug(`deleteSeededAlerts failed: ${err.message}`)
    );
    await deleteDetectionRule(kbnClient, ruleId);
  });

  test('adds investigation guide queries to response actions from the rule editor', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    // 5 min: rule-edit flow + IG queries add + save flow on the detection-
    // engine rule endpoint (PUT is slow on serverless task-manager).
    test.setTimeout(300_000);
    await browserAuth.loginAsOsqueryPowerUser();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(ruleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await pageObjects.osqueryRuleEditor.waitForInvestigationGuideBlockVisible();
    await pageObjects.osqueryRuleEditor.clickOsqueryAddInvestigationGuideQueries();
    await pageObjects.osqueryRuleEditor.waitForInvestigationGuideBlockHidden();
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText(
      "SELECT * FROM os_version where name='{{host.os.name}}';"
    );
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(1)).toContainText(
      'select * from users'
    );
    await pageObjects.osqueryRuleEditor.clickSaveChanges();
    await expect(page.getByText(`${ruleName} was saved`)).toBeVisible();
    await pageObjects.osqueryRuleEditor.dismissAllToasts();
  });

  test('runs a live query from the alert flyout and adds the action to Timeline', async ({
    browserAuth,
    esClient,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 5 min: alert seed + flyout open + agent-dependent submit + results +
    // Add-to-Timeline flow + timeline bottom-bar assertion.
    test.setTimeout(300_000);

    const { agentId, hostName } = await getFirstOnlineAgent(kbnClient);
    await seedAlertForRule(esClient, { ruleId, ruleName, agentId, hostName });

    await browserAuth.loginAsOsqueryPowerUser();

    await pageObjects.osqueryRuleEditor.openRuleAlertsView(ruleName);
    await pageObjects.osqueryAlertFlyout.expandFirstAlert();
    await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
    await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
    await pageObjects.osqueryAlertFlyout.inputFlyoutQuery('select * from uptime;');
    await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
    await page.testSubj
      .locator('osqueryResultsTable')
      .waitFor({ state: 'visible', timeout: 180_000 });

    // EuiCard's `selectable` footer button (Query/Pack mode selector) has no
    // discernible text — emotion-compiled class ends in `-euiCardSelect`, so
    // we exclude via attribute-substring selector. EUI library gap.
    const { violations } = await page.checkA11y({
      include: ['[data-test-subj="flyout-body-osquery"]'],
      exclude: ['[class*="euiCardSelect"]'],
      timeoutMs: 25_000,
    });
    expect(violations).toStrictEqual([]);

    await pageObjects.osqueryAlertFlyout.clickAddToTimeline();
    await page.testSubj.locator('globalToastList').getByText('Added').waitFor({ state: 'visible' });
    await pageObjects.osqueryRuleEditor.dismissAllToasts();
    await pageObjects.osqueryAlertFlyout.clickCancelInFlyout();
    await page.testSubj.locator('timeline-bottom-bar').getByText('Untitled timeline').click();
    await expect(page.testSubj.locator('draggableWrapperKeyboardHandler')).toContainText(
      'action_id:'
    );
  });

  test('persists investigation guide suggestions after saving the rule twice', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 5 min: rule-edit navigation + re-edit (two saves) + IG-block render +
    // toast handling. Slow because rule-edit route fetches connectors + rule.
    test.setTimeout(300_000);

    // Seed a dedicated rule with IG response actions baked in — decouples this
    // test from test 1's UI-driven add-IG-queries flow. Ordering-free by
    // design: this test is independently runnable via --grep.
    //
    // The response-action shape mirrors `buildOsqueryAlertTestRule({
    // includeResponseActions: true })` in `helpers/detection_rule_lifecycle.ts`,
    // which in turn mirrors what `clickOsqueryAddInvestigationGuideQueries`
    // writes when the IG button is clicked in the UI — so future changes to
    // the IG button's output should be reflected in that helper's source.
    const seededRule = buildOsqueryAlertTestRule({
      includeResponseActions: true,
      nameSuffix: `ig-persist-${Date.now()}`,
    });
    const created = await createDetectionRule(kbnClient, seededRule);
    const seededRuleId = created.id;
    const seededRuleName = created.name;
    transientRuleIds.push(seededRuleId); // cleaned in afterEach

    await browserAuth.loginAsOsqueryPowerUser();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(seededRuleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await pageObjects.osqueryRuleEditor
      .responseActionItem(0)
      .waitFor({ state: 'visible', timeout: 60_000 });
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText('os_version', {
      timeout: 30_000,
    });
    await pageObjects.osqueryRuleEditor.clickSaveChanges();
    await expect(page.getByText(`${seededRuleName} was saved`)).toBeVisible({
      timeout: 60_000,
    });
    await pageObjects.osqueryRuleEditor.dismissAllToasts();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(seededRuleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await pageObjects.osqueryRuleEditor
      .responseActionItem(0)
      .waitFor({ state: 'visible', timeout: 60_000 });
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText('os_version', {
      timeout: 30_000,
    });
  });
});
