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

test.describe('Alert flyout Osquery case creation', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;
  let packId: string;
  let packName: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    const pack = await apiServices.osquery.packs.create({
      name: `scout-alert-case-pack-${Date.now()}`,
      enabled: true,
      description: 'scout',
      shards: {},
      queries: {
        q1: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
      },
    });
    packId = (pack.data as { data: { saved_object_id: string; name: string } }).data
      .saved_object_id;
    packName = (pack.data as { data: { saved_object_id: string; name: string } }).data.name;

    const rule = buildOsqueryAlertTestRule({ includeResponseActions: true });
    const created = await createDetectionRule(kbnClient, rule);
    ruleId = created.id;
    ruleName = created.name;
  });

  test.afterAll(async ({ kbnClient, apiServices }) => {
    await deleteDetectionRule(kbnClient, ruleId);
    await apiServices.osquery.packs.delete(packId);
  });

  test('runs osquery from an alert and creates a new case with the result attached', async ({
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
    await pageObjects.osqueryAlertFlyout.waitForFlyoutEditorReady();
    await pageObjects.osqueryAlertFlyout.switchFlyoutToPackMode();
    await pageObjects.osqueryAlertFlyout.selectFlyoutPack(packName);
    await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
    await page.testSubj
      .locator('osqueryResultsTable')
      .waitFor({ state: 'visible', timeout: 180_000 });

    await pageObjects.osqueryAlertFlyout.clickAddToCaseFromResults();
    await pageObjects.osqueryCasesPage.openCreateCaseFlyoutFromFilterBar();
    const caseTitle = `scout-case-${Date.now()}`;
    await pageObjects.osqueryCasesPage.fillNewCaseTitle(caseTitle);
    await pageObjects.osqueryCasesPage.fillNewCaseDescription('scout');
    const { violations } = await page.checkA11y({
      include: ['[data-test-subj="create-case-flyout"]'],
      timeoutMs: 25_000,
    });
    expect(violations).toStrictEqual([]);
    await pageObjects.osqueryCasesPage.submitCreateCase();
    await expect(page.getByText(new RegExp(`An alert was added to "${caseTitle}"`))).toBeVisible();
  });
});
