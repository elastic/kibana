/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @kbn/eslint/scout_test_file_naming */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { getFirstOnlineAgent, waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

/**
 * Tier-B real-agent Infra inventory osquery tab.
 *
 * Navigates to the Infra host asset page for the enrolled Elastic Agent and
 * submits a live query through the embedded osquery form, asserting real
 * results arrive without any browser-level mocking. The integration boundary
 * verified here is the Infra → osquery embed → Fleet action → real agent →
 * results index round trip; the Tier-A counterpart (which used `mockFleetAgents`
 * + seeded result rows) could not exercise the asset-resolution path Infra
 * uses to derive the agent.
 */
test.describe(
  'Real-agent Infra inventory osquery tab',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    test('submits a live query from the embedded form and renders real results', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      // 6 min: enrollment slack + Infra page load + submit + poll + render.
      test.setTimeout(360_000);

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 1, timeoutMs: 240_000 });
      const { hostName } = await getFirstOnlineAgent(kbnClient);

      await browserAuth.loginAsOsqueryPowerUser();

      await pageObjects.osqueryInventoryHostOsquery.gotoHostOsqueryTab('default', hostName);
      const { actionId } = await pageObjects.osqueryInventoryHostOsquery.submitSimpleEmbeddedQuery(
        'select * from uptime limit 1;'
      );

      // Wait for the real osquery action to complete on the enrolled agent.
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }

      await expect(page.testSubj.locator('osqueryResultsTable')).toBeVisible({ timeout: 180_000 });
      // Existence of at least one populated data cell is what distinguishes a
      // real-agent round trip from an empty mocked grid.
      // eslint-disable-next-line playwright/no-nth-methods -- any real result cell
      await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
        timeout: 120_000,
      });
    });
  }
);
