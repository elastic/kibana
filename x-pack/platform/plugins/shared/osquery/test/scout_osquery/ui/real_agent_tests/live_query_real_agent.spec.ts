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
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

/**
 * Tier-B real-agent live query.
 *
 * Submits a live query against the Docker-managed Elastic Agent provisioned by
 * `real_agent_tests/global.setup.ts`, polls Fleet/osquery until the action
 * completes successfully, and asserts the UI surfaces at least one populated
 * result row. This is the integration check the mocked Tier-A specs cannot
 * provide — it validates the full round trip through the osquery_manager
 * integration, the action dispatcher, and the result indexer.
 */
test.describe(
  'Real-agent live query round trip',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    test('submits "select * from uptime" against the enrolled agent and renders real results', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      // 6 min: enrollment slack + submit + poll + render.
      test.setTimeout(360_000);

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 1, timeoutMs: 240_000 });

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from uptime;');
      const { actionId } = await pageObjects.osqueryLiveQueryForm.submitQuery();

      // Wait for the real osquery action to complete on at least one agent.
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }

      await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
      await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
        timeout: 60_000,
      });

      // Real agent produces at least one populated row — the existence of a data
      // cell at all is what differentiates this from a mocked-empty grid.
      // eslint-disable-next-line playwright/no-nth-methods -- any real result cell
      await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
        timeout: 120_000,
      });
    });
  }
);
