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
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';
import { mockFleetAgents, indexActionResponses, indexResultRows } from '../helpers/data_loaders';

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

    // TODO: re-enable Scout osquery alert flyout + cases flow when stable.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip('runs osquery from an alert and attaches results to an existing + a new case', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
      apiServices,
    }) => {
      // 4 min: seed + flyout submit + two case attachments.
      test.setTimeout(240_000);

      // Mock fleet agents first so the picker renders without real enrollment.
      const { agents } = await mockFleetAgents(page, { count: 1 });
      const mockedAgent = agents[0];

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

      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId: mockedAgent.agentId,
        hostName: mockedAgent.hostName,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();

      await test.step('submit a single live query from the alert flyout', async () => {
        await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
        await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
        await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
        await pageObjects.osqueryAlertFlyout.waitForFlyoutEditorReady();
        await pageObjects.osqueryAlertFlyout.inputFlyoutQuery('select * from uptime;');
        const { queryActionIds } = await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
        // Single-query flyout mode → results UI filters on per-query id.
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
