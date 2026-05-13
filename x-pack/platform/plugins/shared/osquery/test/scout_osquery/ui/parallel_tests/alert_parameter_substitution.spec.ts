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

// The host.os.name the seeded alert advertises — must match what we synthesize
// in the mocked result rows so the parameter-substituted query "succeeds".
const SEEDED_HOST_OS_NAME = 'Linux';

test.describe(
  'Osquery parameter substitution from alerts',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let ruleId: string;
    let ruleName: string;
    let embeddedRuleBody: ReturnType<typeof buildOsqueryAlertTestRule>;

    test.beforeAll(async ({ kbnClient }) => {
      embeddedRuleBody = buildOsqueryAlertTestRule({
        includeResponseActions: true,
        nameSuffix: `scout-param-${Date.now()}`,
      });
      ruleId = randomUUID();
      ruleName = embeddedRuleBody.name;
      await bootstrapSecurityAlertsIndex(kbnClient);
    });

    test.afterAll(async ({ esClient, log }) => {
      await deleteSeededAlerts(esClient, ruleId).catch((err: Error) =>
        log.debug(`deleteSeededAlerts failed: ${err.message}`)
      );
    });

    test('runs a take-action query against all enrolled agents with substituted parameters', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(240_000);

      // Two mocked agents so "All agents" selection has multiple targets.
      const { agents } = await mockFleetAgents(page, { count: 2 });
      const [primary] = agents;

      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId: primary.agentId,
        hostName: primary.hostName,
        hostOsName: SEEDED_HOST_OS_NAME,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      // Tier-A: clear pre-selected primary host and pick both mocked agents by
      // hostname (NOT "All agents") so the POST avoids Fleet's server-side
      // `.fleet-agents` lookup. Selecting both preserves the ">= 2 result rows"
      // assertion below.
      await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectMockedAgents(
        agents.map((a) => a.hostName)
      );
      await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
        "SELECT * FROM os_version where name='{{host.os.name}}';"
      );
      const { queryActionIds } = await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
      const queryActionId = queryActionIds[0] ?? 'unknown';

      await indexActionResponses(esClient, {
        actionId: queryActionId,
        agents,
        rowCountPerAgent: 1,
      });
      await indexResultRows(esClient, {
        actionId: queryActionId,
        agents,
        rows: [{ name: SEEDED_HOST_OS_NAME, version: '5.15' }],
      });

      const flyoutOsquery = page
        .getByTestId('flyout-body-osquery')
        .filter({ visible: true })
        // eslint-disable-next-line playwright/no-nth-methods -- active osquery flyout = last visible root
        .last();
      await expect
        .poll(async () => flyoutOsquery.locator('[data-grid-row-index]').count(), {
          timeout: 120_000,
        })
        .toBeGreaterThanOrEqual(2);
      await expect(flyoutOsquery).toContainText(/version/i, {
        timeout: 60_000,
      });
    });

    test('substitutes parameters in osquery launched from timeline-linked alerts', async ({
      browserAuth,
      esClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(240_000);

      const { agents } = await mockFleetAgents(page, { count: 2 });
      const [primary] = agents;

      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId: primary.agentId,
        hostName: primary.hostName,
        hostOsName: SEEDED_HOST_OS_NAME,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryRuleEditor.dismissDocumentFlyoutToExposeAlertsTable();
      await pageObjects.osqueryAlertFlyout.openFirstAlertInTimelineAndExpand();
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      // Tier-A: pick both mocked agents by hostname (NOT "All agents") so the
      // POST avoids Fleet's server-side `.fleet-agents` lookup. Picking both
      // preserves the ">= 2 result rows" assertion below.
      await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectMockedAgents(
        agents.map((a) => a.hostName)
      );
      await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
        "SELECT * FROM os_version where name='{{host.os.name}}';"
      );
      const { queryActionIds } = await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();
      const queryActionId = queryActionIds[0] ?? 'unknown';

      await indexActionResponses(esClient, {
        actionId: queryActionId,
        agents,
        rowCountPerAgent: 1,
      });
      await indexResultRows(esClient, {
        actionId: queryActionId,
        agents,
        rows: [{ name: SEEDED_HOST_OS_NAME, version: '5.15' }],
      });

      const flyoutOsqueryTimeline = page
        .getByTestId('flyout-body-osquery')
        .filter({ visible: true })
        // eslint-disable-next-line playwright/no-nth-methods -- last visible flyout (timeline stack)
        .last();
      await expect
        .poll(async () => flyoutOsqueryTimeline.locator('[data-grid-row-index]').count(), {
          timeout: 240_000,
        })
        .toBeGreaterThanOrEqual(2);
      await expect(flyoutOsqueryTimeline).toContainText(/version/i, {
        timeout: 60_000,
      });
    });
  }
);
