/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { uiTest as test } from '../fixtures';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { mockFleetAgents, indexActionResponses, indexResultRows } from '../helpers/data_loaders';

test.describe(
  'Live query submission with enrolled agents',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    // One submit + steps: avoids tripling agent cold-start for the same response.
    test('submits a live query against multiple mocked agents and validates results, per-agent rendering, and the Discover link', async ({
      browserAuth,
      context,
      esClient,
      page,
      pageObjects,
    }) => {
      // 3 min: seed + submit + results + Discover tab.
      test.setTimeout(180_000);

      const { agents } = await mockFleetAgents(page, { count: 2 });

      await browserAuth.loginAsOsqueryPowerUser();
      await pageObjects.osqueryNavigation.gotoNewLiveQuery();

      await test.step('submit against both mocked agents with a custom 120s timeout', async () => {
        // Tier-A note: specific-agent selection (NOT "All agents") — sends
        // `agent_ids: [...]` to POST /live_queries, which bypasses Fleet's
        // server-side `.fleet-agents` listAgents call (that index doesn't
        // exist without Fleet Server). See `selectMockedAgents` JSDoc.
        await pageObjects.osqueryLiveQueryForm.selectMockedAgents(agents.map((a) => a.hostName));
        await pageObjects.osqueryLiveQueryForm.clearAndInputQuery('select * from os_version;');
        await pageObjects.osqueryLiveQueryForm.clickAdvanced();
        await pageObjects.osqueryLiveQueryForm.fillInQueryTimeout('120');
        const { queryActionIds } = await pageObjects.osqueryLiveQueryForm.submitQuery();
        // Single-query mode → exactly one per-query id; the results UI filters by THIS, not the umbrella id.
        const queryActionId = queryActionIds[0] ?? 'unknown';

        await indexActionResponses(esClient, {
          actionId: queryActionId,
          agents,
          rowCountPerAgent: 1,
        });
        await indexResultRows(esClient, {
          actionId: queryActionId,
          agents,
          rows: [{ name: 'Linux', version: '5.15' }],
        });

        await pageObjects.osqueryLiveQueryForm.waitForSingleQueryResults();
        await expect(pageObjects.osqueryLiveQueryForm.resultsTable).toBeVisible({
          timeout: 60_000,
        });
      });

      await test.step('renders at least one populated result row', async () => {
        // eslint-disable-next-line playwright/no-nth-methods -- any result cell
        await expect(page.testSubj.locator('dataGridRowCell').first()).toBeVisible({
          timeout: 60_000,
        });
      });

      await test.step('renders per-agent rows via the agent.name column', async () => {
        // agent.name header appears only when per-agent rows exist.
        await expect(page.testSubj.locator('dataGridHeaderCell-agent.name')).toBeVisible({
          timeout: 60_000,
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
