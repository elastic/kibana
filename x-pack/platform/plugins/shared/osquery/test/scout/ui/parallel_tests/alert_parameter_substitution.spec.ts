/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import {
  buildOsqueryAlertTestRule,
  createDetectionRule,
  deleteDetectionRule,
} from '../helpers/detection_rule_lifecycle';

const localTags = ['@local-stateful-classic', '@local-serverless-security_complete'];

test.describe('Osquery parameter substitution from alerts', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;

  test.beforeAll(async ({ kbnClient }) => {
    const rule = buildOsqueryAlertTestRule({ includeResponseActions: true });
    const created = await createDetectionRule(kbnClient, rule);
    ruleId = created.id;
    ruleName = created.name;
  });

  test.afterAll(async ({ kbnClient }) => {
    await deleteDetectionRule(kbnClient, ruleId);
  });

  test('substitutes parameters in investigation guide queries opened from the alert flyout', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.openRuleAlertsView(ruleName);
    await pageObjects.osqueryAlertFlyout.expandFirstAlert();
    await pageObjects.osqueryAlertFlyout.openInvestigationGuide();
    await pageObjects.osqueryAlertFlyout.doubleClickInvestigationGuideQuery('Get processes');
    await pageObjects.osqueryAlertFlyout.clickFlyoutMonacoEditor();
    const flyout = page.testSubj.locator('flyout-body-osquery');
    await expect(flyout).toContainText(/SELECT \* FROM os_version where name=/);
    await expect(flyout.locator('input[value="host.os.platform"]')).toBeVisible();
  });

  test('runs a take-action query against all enrolled agents with substituted parameters', async ({
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
    await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectAllAgents();
    await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
      "SELECT * FROM os_version where name='{{host.os.name}}';"
    );
    await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();

    const gridRows = page.testSubj.locator('flyout-body-osquery').locator('[data-grid-row-index]');
    // eslint-disable-next-line playwright/no-nth-methods -- `data-grid-row-index=0` is the header row in EuiDataGrid; row 1 is the first data row which confirms the substituted query returned at least one result
    await expect(gridRows.nth(1)).toBeVisible({ timeout: 180_000 });
  });

  test('substitutes parameters in osquery launched from timeline-linked alerts', async ({
    browserAuth,
    page,
    pageObjects,
  }) => {
    test.setTimeout(300_000);
    await browserAuth.loginAsAdmin();

    await pageObjects.osqueryRuleEditor.openRuleAlertsView(ruleName);
    // eslint-disable-next-line playwright/no-nth-methods -- one "send alert to timeline" button per alert row; first-match drives the first alert into Timeline which is the only required fixture for this test
    await pageObjects.osqueryAlertFlyout.sendAlertToTimelineButton.first().click();
    // eslint-disable-next-line playwright/no-nth-methods -- the timeline grid renders one expand toggle per event row; first-match expands the topmost event which is the alert we just linked
    await page.testSubj.locator('docTableExpandToggleColumn').first().click();
    await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
    await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
    await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectAllAgents();
    await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
      "SELECT * FROM os_version where name='{{host.os.name}}';"
    );
    await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
    await page.testSubj
      .locator('osqueryResultsTable')
      .waitFor({ state: 'visible', timeout: 180_000 });
  });
});
