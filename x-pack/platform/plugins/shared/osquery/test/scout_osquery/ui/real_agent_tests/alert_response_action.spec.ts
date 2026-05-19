/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_test_file_naming */

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

/**
 * Tier-B real-agent detection-rule response action.
 *
 * Seeds a security alert tagged with the real enrolled Elastic Agent and an
 * embedded osquery response action, then asserts the response action expands
 * inside the alert flyout and the real agent's osquery output renders in the
 * action results grid. This validates the end-to-end execution of detection
 * rule → response action dispatcher → real osquery agent → result index →
 * alert flyout, which the mocked Tier-A coverage cannot exercise.
 */
test.describe(
  'Real-agent detection rule response action',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let ruleId: string;
    let ruleName: string;
    let embeddedRuleBody: ReturnType<typeof buildOsqueryAlertTestRule>;

    test.beforeAll(async ({ kbnClient }) => {
      embeddedRuleBody = buildOsqueryAlertTestRule({
        includeResponseActions: true,
        nameSuffix: `scout-real-response-${Date.now()}`,
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

    test('renders real osquery results inside the alert flyout response action grid', async ({
      browserAuth,
      esClient,
      kbnClient,
      page,
      pageObjects,
    }) => {
      // 7 min: seed + open flyout + real osquery action execution + ingest + render.
      test.setTimeout(420_000);

      const { agentId, hostName, hostOsName } = await getFirstOnlineAgent(kbnClient);
      const seed = await seedAlertForRule(esClient, {
        ruleId,
        ruleName,
        agentId,
        hostName,
        hostOsName,
        embeddedDetectionRuleBody: embeddedRuleBody as Record<string, unknown>,
      });

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryRuleEditor.openSeededAlertFlyout(seed);

      // The seeded alert's embedded detection-rule body declares two osquery
      // response actions. Both are queued against the real enrolled agent; we
      // assert the first one's results render (the second covers a different
      // query path but is incidental for this Tier-B integration check).
      const flyoutOsquery = page
        .getByTestId('flyout-body-osquery')
        .filter({ visible: true })
        // eslint-disable-next-line playwright/no-nth-methods -- active osquery response action panel
        .last();

      await expect
        .poll(async () => flyoutOsquery.locator('[data-grid-row-index]').count(), {
          timeout: 300_000,
        })
        .toBeGreaterThanOrEqual(1);
      await expect(flyoutOsquery).toContainText(/version/i, { timeout: 60_000 });
    });
  }
);
