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
import { getFirstOnlineAgent, waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';

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

    // IG query text is read-only; substitution is covered via Take action + `{{host.os.name}}`.

    test('runs a take-action query against all enrolled agents with substituted parameters', async ({
      browserAuth,
      esClient,
      kbnClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(300_000);

      const { agentId, hostName, hostOsName } = await getFirstOnlineAgent(kbnClient);
      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId,
        hostName,
        hostOsName,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      // Need both Docker agents online before "All agents" (second can lag on serverless).
      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 2, timeoutMs: 180_000 });

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectAllAgents();
      await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
        "SELECT * FROM os_version where name='{{host.os.name}}';"
      );
      await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();

      const flyoutOsquery = page
        .getByTestId('flyout-body-osquery')
        .filter({ visible: true })
        // eslint-disable-next-line playwright/no-nth-methods -- active osquery flyout = last visible root
        .last();
      await expect
        .poll(async () => flyoutOsquery.locator('[data-grid-row-index]').count(), {
          timeout: 180_000,
        })
        .toBeGreaterThanOrEqual(2);
      await expect(flyoutOsquery).toContainText(/version/i, {
        timeout: 60_000,
      });
    });

    test('substitutes parameters in osquery launched from timeline-linked alerts', async ({
      browserAuth,
      esClient,
      kbnClient,
      page,
      pageObjects,
    }) => {
      test.setTimeout(300_000);

      const { agentId, hostName, hostOsName } = await getFirstOnlineAgent(kbnClient);
      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId,
        hostName,
        hostOsName,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 2, timeoutMs: 180_000 });

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);
      await pageObjects.osqueryRuleEditor.dismissDocumentFlyoutToExposeAlertsTable();
      await pageObjects.osqueryAlertFlyout.openFirstAlertInTimelineAndExpand();
      await pageObjects.osqueryAlertFlyout.openTakeActionMenu();
      await pageObjects.osqueryAlertFlyout.chooseOsqueryAction();
      await pageObjects.osqueryAlertFlyout.clearAgentsAndSelectAllAgents();
      await pageObjects.osqueryAlertFlyout.inputFlyoutQuery(
        "SELECT * FROM os_version where name='{{host.os.name}}';"
      );
      await pageObjects.osqueryAlertFlyout.clickSubmitInFlyout();

      const flyoutOsqueryTimeline = page
        .getByTestId('flyout-body-osquery')
        .filter({ visible: true })
        // eslint-disable-next-line playwright/no-nth-methods -- last visible flyout (timeline stack)
        .last();
      await expect
        .poll(async () => flyoutOsqueryTimeline.locator('[data-grid-row-index]').count(), {
          timeout: 300_000,
        })
        .toBeGreaterThanOrEqual(2);
      await expect(flyoutOsqueryTimeline).toContainText(/version/i, {
        timeout: 60_000,
      });
    });
  }
);
