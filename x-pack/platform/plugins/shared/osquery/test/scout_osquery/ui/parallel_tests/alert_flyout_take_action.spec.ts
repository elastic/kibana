/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import {
  buildOsqueryAlertTestRule,
  createDetectionRule,
  deleteDetectionRule,
} from '../helpers/detection_rule_lifecycle';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';
import { mockFleetAgents, indexActionResponses, indexResultRows } from '../helpers/data_loaders';

test.describe(
  'Osquery rule editor and alert flyout (investigation guide + timeline)',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let editorRuleId: string;
    let editorRuleName: string;
    const transientRuleIds: string[] = [];
    let flyoutRuleId: string;
    let flyoutRuleName: string;
    let flyoutEmbeddedBody: ReturnType<typeof buildOsqueryAlertTestRule>;

    test.beforeAll(async ({ kbnClient }) => {
      await bootstrapSecurityAlertsIndex(kbnClient);

      const rule = buildOsqueryAlertTestRule({ includeResponseActions: false });
      const created = await createDetectionRule(kbnClient, rule);
      editorRuleId = created.id;
      editorRuleName = created.name;

      flyoutEmbeddedBody = buildOsqueryAlertTestRule({
        includeResponseActions: false,
        nameSuffix: `scout-flyout-timeline-${Date.now()}`,
      });
      flyoutRuleId = randomUUID();
      flyoutRuleName = flyoutEmbeddedBody.name;
    });

    test.afterEach(async ({ kbnClient }) => {
      while (transientRuleIds.length > 0) {
        const id = transientRuleIds.pop();
        if (id) await deleteDetectionRule(kbnClient, id);
      }
    });

    test.afterAll(async ({ kbnClient, esClient, log }) => {
      await deleteSeededAlerts(esClient, flyoutRuleId).catch((err: Error) =>
        log.debug(`deleteSeededAlerts failed: ${err.message}`)
      );
      await deleteDetectionRule(kbnClient, editorRuleId);
    });

    test('adds investigation guide queries to response actions from the rule editor', async ({
      browserAuth,
      page,
      pageObjects,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.navigateToRuleEdit(editorRuleId);
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
      await expect(page.getByText(`${editorRuleName} was saved`)).toBeVisible();
      await pageObjects.osqueryRuleEditor.dismissAllToasts();
    });

    test('persists investigation guide suggestions after saving the rule twice', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(180_000);

      const seededRule = buildOsqueryAlertTestRule({
        includeResponseActions: true,
        nameSuffix: `ig-persist-${Date.now()}`,
      });
      const created = await createDetectionRule(kbnClient, seededRule);
      const seededRuleId = created.id;
      const seededRuleName = created.name;
      transientRuleIds.push(seededRuleId);

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.navigateToRuleEdit(seededRuleId);
      await pageObjects.osqueryRuleEditor.goToActionsTab();
      await pageObjects.osqueryRuleEditor
        .responseActionItem(0)
        .waitFor({ state: 'visible', timeout: 60_000 });
      await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText(
        'os_version',
        {
          timeout: 30_000,
        }
      );
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
      await expect(pageObjects.osqueryRuleEditor.responseActionItem(0)).toContainText(
        'os_version',
        {
          timeout: 30_000,
        }
      );
    });

    test('runs a live query from the alert flyout and adds the action to Timeline', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(240_000);

      // Mock the agent picker before seeding the alert so the alert's host details
      // match an agent the picker will show.
      const { agents } = await mockFleetAgents(page, { count: 1 });
      const [mockedAgent] = agents;

      const seed = await seedAlertForRule(esClient, {
        ruleId: flyoutRuleId,
        ruleName: flyoutRuleName,
        agentId: mockedAgent.agentId,
        hostName: mockedAgent.hostName,
        embeddedDetectionRuleBody: flyoutEmbeddedBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      await pageObjects.osqueryAlertFlyout.inputFlyoutQuery('select * from uptime;');
      const { queryActionIds } = await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
      // Single-query flyout mode → exactly one per-query id (results table filters by THIS).
      const queryActionId = queryActionIds[0] ?? 'unknown';

      await indexActionResponses(esClient, {
        actionId: queryActionId,
        agents,
        rowCountPerAgent: 1,
      });
      await indexResultRows(esClient, {
        actionId: queryActionId,
        agents,
        rows: [{ days: 1 }],
      });

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults(
        pageObjects.osqueryAlertFlyout.flyoutBody
      );

      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="flyout-body-osquery"]'],
        exclude: [
          '[class*="euiCardSelect"]',
          // Exclude DataGrid virtualized scroll (known axe noise; unstable ancestor id).
          '[class*="euiDataGrid__virtualized"]',
          '[data-test-subj="osqueryResultsTable"]',
        ],
        timeoutMs: 25_000,
      });
      expect(violations).toStrictEqual([]);

      await pageObjects.osqueryAlertFlyout.clickAddToTimeline();
      await page.testSubj
        .locator('globalToastList')
        .getByText('Added')
        .waitFor({ state: 'visible' });
      await pageObjects.osqueryRuleEditor.dismissAllToasts();
      await pageObjects.osqueryAlertFlyout.clickCancelInFlyout();
      await page.testSubj.locator('timeline-bottom-bar').getByText('Untitled timeline').click();
      await expect(page.testSubj.locator('draggableWrapperKeyboardHandler')).toContainText(
        'action_id:'
      );
    });
  }
);
