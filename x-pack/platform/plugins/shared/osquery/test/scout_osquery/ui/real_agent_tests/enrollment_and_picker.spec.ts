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

/**
 * Tier-B real-agent enrollment + agent picker integration.
 *
 * Provisions a real Elastic Agent on an osquery-enabled policy via
 * `real_agent_tests/global.setup.ts` and asserts the agent picker rendered by
 * the osquery live-query form surfaces it — covering the contract between
 * Fleet's `GET /internal/osquery/fleet_wrapper/agents` endpoint and the picker
 * UI without any mocking.
 */
test.describe(
  'Real-agent enrollment surfaces in the osquery agent picker',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    test('shows a freshly enrolled Elastic Agent in the picker after global setup', async ({
      browserAuth,
      kbnClient,
      page,
      pageObjects,
    }) => {
      // Fleet reconciliation can take longer than the per-step default after a fresh setup.
      test.setTimeout(360_000);

      await waitForAtLeastOneAgentOnline(kbnClient, {
        expectedCount: 1,
        timeoutMs: 240_000,
      });
      const { hostName } = await getFirstOnlineAgent(kbnClient);

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await test.step('opens the agent picker and renders the enrolled host', async () => {
        const agentInput =
          pageObjects.osqueryLiveQueryForm.agentSelection.getByTestId('comboBoxSearchInput');
        await agentInput.waitFor({ state: 'visible', timeout: 30_000 });
        await agentInput.click();
        await expect(page.getByText(hostName)).toBeVisible({ timeout: 60_000 });
        await page.keyboard.press('Escape');
      });

      await test.step('selecting "All agents" toggles the submit button enabled', async () => {
        await pageObjects.osqueryLiveQueryForm.selectAllAgents();
        // Submit requires the query editor to also be non-empty, so type something.
        await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select 1 as ok;');
        await expect(pageObjects.osqueryLiveQueryForm.submitButton).toBeEnabled({
          timeout: 30_000,
        });
      });
    });
  }
);
