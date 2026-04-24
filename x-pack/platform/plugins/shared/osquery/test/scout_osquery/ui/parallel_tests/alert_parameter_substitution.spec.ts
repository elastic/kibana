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
import { getFirstOnlineAgent, waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import {
  bootstrapSecurityAlertsIndex,
  deleteSeededAlerts,
  seedAlertForRule,
} from '../helpers/seed_alert';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

test.describe('Osquery parameter substitution from alerts', { tag: localTags }, () => {
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

  // NOTE: the originally-planned "double-click IG query → osquery editor
  // opens with substituted params" flow isn't a real UI path — the current
  // security_solution build only exposes IG queries as read-only text
  // (`[data-test-subj="osquery-investigation-guide-text"]`, per the Cypress
  // reference at `alert_response_actions.cy.ts:71`). The substitution contract
  // is exercised end-to-end by the two tests below which go through the
  // "Take action" menu and use `{{host.os.name}}` in the submitted query — the
  // same flow `cypress/tasks/live_query.ts::takeOsqueryActionWithParams` tests.

  test('runs a take-action query against all enrolled agents with substituted parameters', async ({
    browserAuth,
    esClient,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 5 min: alert seed + flyout open + 2-agent wait + substituted-query submit.
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

    // The assertion below requires two response rows (one per enrolled Docker
    // agent). `global.setup.ts` provisions two agents but on serverless CI the
    // second one can still be mid-enrollment when `getFirstOnlineAgent`
    // returns. Without this gate the "All agents" selection below runs against
    // a single-agent target and we get only one row. 180 s matches the Docker
    // agent cold-start budget observed in `global.setup.ts:waitForAgents`.
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

    // Multiple `flyout-body-osquery` roots can exist (alert + timeline). `.last()`
    // alone picked a hidden serverless portal instance with no results grid.
    // Match Cypress `alert_response_actions.cy.ts`: at least header + one data row.
    // eslint-disable-next-line playwright/no-nth-methods -- when multiple portals match, the active Osquery flyout is the most recently mounted visible root
    const flyoutOsquery = page.getByTestId('flyout-body-osquery').filter({ visible: true }).last();
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
    // 5 min: alert seed + timeline-open flow + flyout + substituted-query submit.
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
      // eslint-disable-next-line playwright/no-nth-methods -- timeline stacks on alert UI; the live Osquery flyout is the last visible portal root
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
});
