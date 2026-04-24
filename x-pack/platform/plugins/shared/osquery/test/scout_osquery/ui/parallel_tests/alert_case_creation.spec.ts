/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { buildOsqueryAlertTestRule } from '../helpers/detection_rule_lifecycle';
import { getFirstOnlineAgent } from '../helpers/fleet_agents';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Alert flyout Osquery case creation', { tag: localTags }, () => {
  let ruleId: string;
  let ruleName: string;
  let packId: string;
  let packName: string;
  let embeddedRuleBody: ReturnType<typeof buildOsqueryAlertTestRule>;
  const transientCaseIds: string[] = [];

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    if (!firstPolicyId) {
      throw new Error(
        'alert_case_creation: no Fleet policy id from listFleetWrapperPackagePolicies'
      );
    }

    const pack = await apiServices.osquery.packs.create({
      name: `scout-alert-case-pack-${Date.now()}`,
      enabled: true,
      description: 'scout',
      shards: {},
      policy_ids: [firstPolicyId],
      queries: {
        q1: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
      },
    });
    packId = (pack.data as { data: { saved_object_id: string; name: string } }).data
      .saved_object_id;
    packName = (pack.data as { data: { saved_object_id: string; name: string } }).data.name;

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

  test.afterAll(async ({ esClient, apiServices, log }) => {
    await deleteSeededAlerts(esClient, ruleId).catch((err: Error) =>
      log.debug(`deleteSeededAlerts failed: ${err.message}`)
    );
    await apiServices.osquery.packs.delete(packId);
  });

  // One submit, two Add to Case clicks: existing case (select) then new case (create).
  test('runs osquery from an alert and attaches results to an existing + a new case', async ({
    browserAuth,
    esClient,
    kbnClient,
    page,
    pageObjects,
    apiServices,
  }) => {
    // 7 min: pack submit + two case attachments on cold stacks.
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

    await test.step('submit osquery in pack mode from the alert flyout', async () => {
      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      await pageObjects.osqueryAlertFlyout.waitForFlyoutEditorReady();
      await pageObjects.osqueryAlertFlyout.switchFlyoutToPackMode();
      await pageObjects.osqueryAlertFlyout.selectFlyoutPack(packName);
      await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
      // Pack flyout: use pack results waiter (panel vs aggregate table).
      await pageObjects.osqueryLiveQueryForm.waitForPackResults();
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
});
