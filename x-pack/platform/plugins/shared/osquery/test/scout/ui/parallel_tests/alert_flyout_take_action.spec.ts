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

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe.configure({ mode: 'serial' });

test.describe('Alert flyout take action and investigation guide', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = buildOsqueryAlertTestRule({ includeResponseActions: false });
    const created = await createDetectionRule(kbnClient, rule);
    ruleId = created.id;
    ruleName = created.name;
  });

  test.afterAll(async ({ kbnClient }) => {
    await deleteDetectionRule(kbnClient, ruleId);
  });

  test('adds investigation guide queries to response actions from the rule editor', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(ruleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await pageObjects.osqueryRuleEditor.waitForInvestigationGuideBlockVisible();
    await pageObjects.osqueryRuleEditor.clickOsqueryAddInvestigationGuideQueries();
    await pageObjects.osqueryRuleEditor.waitForInvestigationGuideBlockHidden();
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText(
      "SELECT * FROM os_version where name='{{host.os.name}}';"
    );
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(1)).toContainText('select * from users');
    await pageObjects.osqueryRuleEditor.clickSaveChanges();
    await expect(page.getByText(`${ruleName} was saved`)).toBeVisible();
    await pageObjects.osqueryRuleEditor.dismissToastIfVisible();
  });

  test('runs a live query from the alert flyout and adds the action to Timeline', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.openRuleAlertsView(ruleName);
    await pageObjects.osqueryAlertFlyout.expandFirstAlert();
    await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
    await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
    await pageObjects.osqueryAlertFlyout.inputFlyoutQuery('select * from uptime;');
    await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
    await page.testSubj.locator('osqueryResultsTable').waitFor({ state: 'visible', timeout: 180_000 });

    const { violations } = await page.checkA11y({
      include: ['[data-test-subj="flyout-body-osquery"]'],
      timeoutMs: 25_000,
    });
    expect(violations).toStrictEqual([]);

    await pageObjects.osqueryAlertFlyout.clickAddToTimeline();
    await page.testSubj.locator('globalToastList').getByText('Added').waitFor({ state: 'visible' });
    await pageObjects.osqueryRuleEditor.dismissToastIfVisible();
    await pageObjects.osqueryAlertFlyout.clickCancelInFlyout();
    await page.testSubj.locator('timeline-bottom-bar').getByText('Untitled timeline').click();
    await expect(page.testSubj.locator('draggableWrapperKeyboardHandler')).toContainText('action_id:');
  });

  test('persists investigation guide suggestions after saving the rule twice', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(ruleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText('os_version');
    await pageObjects.osqueryRuleEditor.clickSaveChanges();
    await pageObjects.osqueryRuleEditor.dismissToastIfVisible();

    await pageObjects.osqueryRuleEditor.navigateToRuleEdit(ruleId);
    await pageObjects.osqueryRuleEditor.goToActionsTab();
    await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText('os_version');
  });
});
