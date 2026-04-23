/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';
import { waitForLiveQueryComplete } from '../helpers/poll_live_query_history';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];

const MEMORY_QUERY_KEY = 'system_memory_linux_elastic';
const SYSTEM_INFO_QUERY_KEY = 'system_info_elastic';

test.describe('Live query pack submission', { tag: localTags }, () => {
  let packId: string;
  let packName: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);

    // Seed a two-query pack via API so the spec focuses on the live-query
    // page's pack-mode UI, not pack CREATION (that path is covered by
    // `packs_crud.spec.ts`). Timestamp suffix prevents collisions if a
    // previous run crashed mid-test and left the pack behind.
    const created = await apiServices.osquery.packs.create({
      name: `scout-live-pack-${Date.now()}`,
      enabled: true,
      description: 'scout live-query page pack-mode test',
      shards: {},
      queries: {
        [MEMORY_QUERY_KEY]: {
          ecs_mapping: {},
          interval: 3600,
          platform: 'linux',
          query: 'SELECT * FROM memory_info;',
        },
        [SYSTEM_INFO_QUERY_KEY]: {
          ecs_mapping: {},
          interval: 3600,
          platform: 'linux,windows,darwin',
          query: 'SELECT * FROM system_info;',
        },
      },
    });
    const inner = (created.data as { data: { saved_object_id: string; name: string } }).data;
    packId = inner.saved_object_id;
    packName = inner.name;
  });

  test.afterAll(async ({ apiServices }) => {
    if (packId) {
      await apiServices.osquery.packs.delete(packId);
    }
  });

  // Single submission exercises the entire live-query-page pack-mode flow:
  // mode switch → pack combobox → submit → per-query expansion → Status-tab
  // data-grid headers. Splitting into multiple tests would multiply agent
  // cold-start cost for assertions that all read from the same submit
  // response (same reasoning as `live_query_submission_with_agent.spec.ts`).
  test('submits a live pack, expands per-query results, and renders status-tab headers', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 6 min: pack-mode submit + agent execution + per-query grid render can
    // take 3-5 min on a cold stack; 6 leaves slack for CI variance.
    test.setTimeout(360_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();

    await test.step('switches to pack mode', async () => {
      await pageObjects.osqueryLiveQueryForm.selectPackMode();
      await expect(pageObjects.osqueryLiveQueryForm.queryEditor).toBeHidden();
    });

    await test.step('selects the seeded pack', async () => {
      await pageObjects.osqueryLiveQueryForm.selectLivePack(packName);
      // Both query keys render in the pack preview once the combobox
      // selection commits — confirms the pack's queries were resolved
      // before moving on to submission.
      await expect(page.getByText(MEMORY_QUERY_KEY)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(SYSTEM_INFO_QUERY_KEY)).toBeVisible({ timeout: 30_000 });
    });

    await test.step('submits against all agents', async () => {
      await pageObjects.osqueryLiveQueryForm.selectAllAgents();
      const actionId = await pageObjects.osqueryLiveQueryForm.submitQuery();
      if (actionId) {
        await waitForLiveQueryComplete(kbnClient, actionId);
      }
    });

    await test.step('expands per-query results', async () => {
      await pageObjects.osqueryLiveQueryForm.togglePackQuery(MEMORY_QUERY_KEY);
      // Any populated result cell within the osquery results panel confirms
      // the expansion mounted the per-query grid. Same pattern as
      // `live_query_submission_with_agent.spec.ts`: first-match on
      // `dataGridRowCell` under the osquery panel is enough — we don't
      // scope to a specific column because the pack result schema is the
      // aggregate grid, not a fixed set of columns.
      const gridCells =
        pageObjects.osqueryLiveQueryForm.resultsPanel.getByTestId('dataGridRowCell');
      // eslint-disable-next-line playwright/no-nth-methods -- any populated cell in the osquery panel indicates the expanded per-query grid rendered rows
      await expect(gridCells.first()).toBeVisible({ timeout: 180_000 });
    });

    await test.step('renders status-tab data-grid headers', async () => {
      await pageObjects.osqueryLiveQueryForm.statusTab.click();
      await expect(page.testSubj.locator('dataGridHeaderCell-status')).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.testSubj.locator('dataGridHeaderCell-agent_id')).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        page.testSubj.locator('dataGridHeaderCell-action_response.osquery.count')
      ).toBeVisible({ timeout: 60_000 });
    });
  });
});
