/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

test.describe(
  'Live query submission with enrolled agents',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    // One submit + steps: avoids tripling agent cold-start for the same response.
    test('submits a live query against all agents and validates results, per-agent rendering, and the Discover link', async ({
      browserAuth,
      context,
      kbnClient,
      page,
      pageObjects,
    }) => {
      // 6 min: all-agents submit + 120s timeout + results + Discover tab.
      test.setTimeout(360_000);

      await waitForAtLeastOneAgentOnline(kbnClient);
      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await test.step('submit against all agents with a custom 120s timeout', async () => {
        await pageObjects.osqueryLiveQueryForm.selectAllAgents();
        await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from os_version;');
        await pageObjects.osqueryLiveQueryForm.clickAdvanced();
        await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('120');
        const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
        if (actionId) {
          await waitForLiveQueryComplete(kbnClient, actionId);
        }

        await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
        await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
          timeout: 180_000,
        });
      });

      await test.step('renders at least one populated result row', async () => {
        // eslint-disable-next-line playwright/no-nth-methods -- any result cell
        await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
          timeout: 180_000,
        });
      });

      await test.step('renders per-agent rows via the agent.name column', async () => {
        // agent.name header appears only when per-agent rows exist.
        await expect(page.testSubj.locator('dataGridHeaderCell-agent.name')).toBeVisible({
          timeout: 180_000,
        });
      });

      await test.step('opens the Discover link in a new tab', async () => {
        // Discover link: button or link variant — match discover href + target=_blank.
        const discoverLink = page.locator('a[href*="/app/discover"][target="_blank"]');
        // eslint-disable-next-line playwright/no-nth-methods -- first discover anchor
        const firstDiscover = discoverLink.first();
        await firstDiscover.waitFor({ state: 'visible', timeout: 60_000 });
        const [newPage] = await Promise.all([
          context.waitForEvent('page', { timeout: 60_000 }),
          firstDiscover.click(),
        ]);
        await newPage.waitForLoadState('domcontentloaded');
        expect(newPage.url()).toMatch(/\/app\/discover/);
        await newPage.close();
      });
    });
  }
);
