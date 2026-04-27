/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS } from '../../common/scout_parallel_ui_tags';
import { uiTest as test } from '../fixtures';
import { waitForAtLeastOneAgentOnline } from '../helpers/fleet_agents';

interface UnifiedHistoryRow {
  id: string;
  sourceType: 'live' | 'scheduled';
  source: string;
  scheduleId?: string;
  executionCount?: number;
  packName?: string;
}

test.describe('Pack agent-triggered results', { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS }, () => {
  const transientPackIds: string[] = [];

  test.afterEach(async ({ apiServices }) => {
    while (transientPackIds.length > 0) {
      const id = transientPackIds.pop();
      if (id) await apiServices.osquery.packs.delete(id);
    }
  });

  test('shows pack query results in history after scheduled agent execution', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
    kbnClient,
  }) => {
    // 7 min: policy apply on agents + scheduled interval + ES ingest.
    test.setTimeout(420_000);

    await waitForAtLeastOneAgentOnline(kbnClient);

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId, 'expected at least one agent policy with osquery_manager').toBeDefined();

    const packName = `scout-fast-pack-${Date.now()}`;
    const queryId = 'fastQuery';

    // schedule_id is a server UUID; we capture it from history once a row matches packName.
    let capturedScheduleId: string | undefined;
    let capturedExecutionCount: number | undefined;

    const created = await apiServices.osquery.packs.create({
      name: packName,
      enabled: true,
      description: 'scout scheduled pack',
      shards: {},
      policy_ids: [firstPolicyId!],
      queries: {
        // Min UI interval (10s) to land a run inside the test budget.
        [queryId]: { ecs_mapping: {}, interval: 10, query: 'select * from uptime;' },
      },
    });
    const packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;
    transientPackIds.push(packId);

    await test.step('scheduled results surface in the history API', async () => {
      // Poll history API until a scheduled row shows our packName (agent + ES + aggregation).
      const deadline = Date.now() + 360_000;
      let matched: UnifiedHistoryRow | undefined;
      while (Date.now() < deadline) {
        try {
          const { data } = await kbnClient.request<{ data: UnifiedHistoryRow[] }>({
            method: 'GET',
            path: '/api/osquery/history',
            query: { pageSize: 100, sourceFilters: 'scheduled' },
            headers: { 'elastic-api-version': '2023-10-31' },
          });
          matched = data.data?.find((row) => row.packName === packName);
          if (matched) break;
        } catch {
          // History may 404 or be empty until the agent run lands; retry until deadline.
        }

        await new Promise((r) => setTimeout(r, 5_000));
      }

      expect(
        matched,
        `expected scheduled history row with packName="${packName}" within 6 min (agent did not ship scheduled results to ES)`
      ).toBeDefined();
      capturedScheduleId = matched!.scheduleId;
      capturedExecutionCount = matched!.executionCount;
    });

    await browserAuth.loginAsOsqueryPowerUser();

    await test.step('unified history page renders the scheduled row', async () => {
      await pageObjects.osqueryNavigation.gotoHistory();
      // Exact row test-subj avoids duplicate matches when multiple runs exist.
      const rowTestSubj = `row-${capturedScheduleId}_${capturedExecutionCount}`;
      await expect(page.testSubj.locator(rowTestSubj)).toBeVisible({ timeout: 60_000 });
    });

    await test.step('scheduled execution details page resolves with real result data', async () => {
      await page.gotoApp(
        `osquery/history/scheduled/${capturedScheduleId}/${capturedExecutionCount}`
      );

      await expect(page.getByRole('heading', { name: 'Query results' })).toBeVisible({
        timeout: 60_000,
      });

      // Badge ties page to our pack (shell is generic).
      await expect(page.getByText(packName, { exact: true })).toBeVisible({ timeout: 30_000 });

      // Wait for results panel then poll for agent hostname (grid search + virtualization is slow on cold stacks).
      const resultsPanel = page.testSubj.locator('osqueryResultsPanel');
      await resultsPanel.waitFor({ state: 'visible', timeout: 60_000 });
      await expect(async () => {
        // eslint-disable-next-line playwright/no-nth-methods -- agent-0 or agent-1 proves results
        await expect(resultsPanel.getByText(/scout-osquery-agent-[01]/).first()).toBeVisible({
          timeout: 5_000,
        });
      }).toPass({ timeout: 90_000, intervals: [2_000, 5_000, 10_000] });
    });
  });
});
