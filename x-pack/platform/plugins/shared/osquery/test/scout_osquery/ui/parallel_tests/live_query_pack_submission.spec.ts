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

const MEMORY_QUERY_KEY = 'system_memory_linux_elastic';
const SYSTEM_INFO_QUERY_KEY = 'system_info_elastic';

test.describe('Live query pack submission', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  let packId: string;
  let packName: string;

  test.beforeAll(async ({ kbnClient, apiServices }) => {
    await waitForAtLeastOneAgentOnline(kbnClient);

    // API two-query pack — this spec targets live-query pack mode UI only.
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

  // One submit covers pack mode + expansion + status tab (same response — avoids extra agent cold-starts).
  test('submits a live pack, expands per-query results, and renders status-tab headers', async ({
    browserAuth,
    kbnClient,
    page,
    pageObjects,
  }) => {
    // 6 min: pack submit + per-query grid on cold CI.
    test.setTimeout(360_000);

    await browserAuth.loginAsOsqueryPowerUser();
    await pageObjects.osqueryNavigation.gotoNewLiveQuery();

    await test.step('switches to pack mode', async () => {
      await pageObjects.osqueryLiveQueryForm.selectPackMode();
      await expect(pageObjects.osqueryLiveQueryForm.queryEditor).toBeHidden();
    });

    await test.step('selects the seeded pack', async () => {
      await pageObjects.osqueryLiveQueryForm.selectLivePack(packName);
      // Pack preview shows both query keys after combobox commit.
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
      // First data cell in osquery panel = expanded pack grid has rows.
      const gridCells =
        pageObjects.osqueryLiveQueryForm.resultsPanel.getByTestId('dataGridRowCell');
      // eslint-disable-next-line playwright/no-nth-methods -- first result cell in panel
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
