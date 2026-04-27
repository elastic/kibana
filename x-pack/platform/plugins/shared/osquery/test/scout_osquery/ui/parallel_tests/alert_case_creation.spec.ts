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
import { buildOsqueryAlertTestRule } from '../helpers/detection_rule_lifecycle';
import { getFirstOnlineAgent } from '../helpers/fleet_agents';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';

test.describe(
  'Alert flyout Osquery case creation',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let ruleId: string;
    let ruleName: string;
    let embeddedRuleBody: ReturnType<typeof buildOsqueryAlertTestRule>;
    const transientCaseIds: string[] = [];

    test.beforeAll(async ({ kbnClient }) => {
      embeddedRuleBody = buildOsqueryAlertTestRule({
        includeResponseActions: true,
        nameSuffix: `scout-case-${Date.now()}`,
      });
      ruleId = randomUUID();
      ruleName = embeddedRuleBody.name;

      await bootstrapSecurityAlertsIndex(kbnClient);
    });

    test.afterEach(async ({ apiServices }) => {
      while (transientCaseIds.length > 0) {
        const caseId = transientCaseIds.pop();
        if (caseId) await apiServices.cases.delete([caseId]);
      }
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteSeededAlerts(esClient, ruleId).catch((err: Error) =>
        log.debug(`deleteSeededAlerts failed: ${err.message}`)
      );
    });

    // One single-query submit, two Add to Case clicks: existing case (select) then new case (create).
    test('runs osquery from an alert and attaches results to an existing + a new case', async ({
      browserAuth,
      esClient,
      kbnClient,
      page,
      pageObjects,
      apiServices,
    }) => {
      // Cold stacks: agent results + two case attachments.
      test.setTimeout(420_000);

      // API-seeded case drives "Select case"; same results later drive "Create case".
      const existingCaseTitle = `scout-existing-case-${Date.now()}`;
      const existingCase = await apiServices.cases.create({
        title: existingCaseTitle,
        tags: [],
        severity: 'low',
        description: 'scout existing case',
        assignees: [],
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: true, extractObservables: true },
        owner: 'securitySolution',
      });
      const existingCaseId = existingCase.data.id;
      transientCaseIds.push(existingCaseId);

      const { agentId, hostName } = await getFirstOnlineAgent(kbnClient);
      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId,
        hostName,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();

      await test.step('submit a single live query from the alert flyout', async () => {
        await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
        await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
        await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
        await pageObjects.osqueryAlertFlyout.waitForFlyoutEditorReady();
        await pageObjects.osqueryAlertFlyout.inputFlyoutQuery('select * from uptime;');
        await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
        await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults(
          pageObjects.osqueryAlertFlyout.flyoutBody
        );
      });

      await test.step('attach results to the pre-seeded existing case', async () => {
        await pageObjects.osqueryAlertFlyout.clickAddToCaseFromResults();
        await page.getByText('Select case').waitFor({ state: 'visible', timeout: 30_000 });
        await page.testSubj.locator(`cases-table-row-select-${existingCaseId}`).click();
        await expect(
          page.getByText(new RegExp(`An alert was added to "${existingCaseTitle}"`))
        ).toBeVisible();
      });

      await test.step('attach results to a brand new case via the create-case flyout', async () => {
        await pageObjects.osqueryAlertFlyout.clickAddToCaseFromResults();
        await pageObjects.osqueryCasesPage.openCreateCaseFlyoutFromFilterBar();

        const newCaseTitle = `scout-new-case-${Date.now()}`;
        await pageObjects.osqueryCasesPage.fillNewCaseTitle(newCaseTitle);
        await pageObjects.osqueryCasesPage.fillNewCaseDescription('scout');

        // a11y: create-case flyout only; exclude card-select noise (covered elsewhere).
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="create-case-flyout"]'],
          exclude: ['[class*="euiCardSelect"]'],
          timeoutMs: 25_000,
        });
        expect(violations).toStrictEqual([]);

        await pageObjects.osqueryCasesPage.submitCreateCase();
        await expect(
          page.getByText(new RegExp(`An alert was added to "${newCaseTitle}"`))
        ).toBeVisible();
      });
    });
  }
);
