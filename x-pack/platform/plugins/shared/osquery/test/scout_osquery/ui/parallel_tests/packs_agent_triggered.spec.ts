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
import { cleanOsqueryPacksByPrefix } from '../helpers/defensive_cleanup';

const localTags = [...tags.stateful.classic, ...tags.serverless.security.complete];
const PACK_PREFIXES = ['scout-fast-pack-'];

interface UnifiedHistoryRow {
  id: string;
  sourceType: 'live' | 'scheduled';
  source: string;
  scheduleId?: string;
  executionCount?: number;
  packName?: string;
}

test.describe('Pack agent-triggered results', { tag: localTags }, () => {
  // Previously `test.skip(...)` with a ~6 min budget, failing because the
  // assertion was anchored on the pack-details page's `last-results-date` /
  // `docs-count-badge` — both driven by a server aggregation that can lag the
  // actual `logs-osquery_manager.result-*` ingest. The rewrite asserts on
  // user-visible behaviour instead: the scheduled pack results land on the
  // unified history page, and the row's details page renders.
  test.beforeAll(async ({ apiServices }) => {
    // A crashed run can leave a `scout-fast-pack-*` assigned to an agent
    // policy, causing Fleet to ship stale scheduled results that cross-match
    // our new pack's unified-history lookup. Clean before the test seeds.
    await cleanOsqueryPacksByPrefix(apiServices, PACK_PREFIXES);
  });

  test('shows pack query results in history after scheduled agent execution', async ({
    browserAuth,
    page,
    pageObjects,
    apiServices,
    kbnClient,
  }) => {
    // Budget: 7 min. Docker agents can take 30-90s to apply a new osquery
    // policy, plus ≥ one interval's worth of wait for ES ingest.
    test.setTimeout(420_000);

    await waitForAtLeastOneAgentOnline(kbnClient);

    const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
    const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
      .items[0]?.policy_ids?.[0];
    expect(firstPolicyId, 'expected at least one agent policy with osquery_manager').toBeDefined();

    const packName = `scout-fast-pack-${Date.now()}`;
    const queryId = 'fastQuery';

    let packId: string | undefined;
    // Populated from the history API once the agent ships its first scheduled
    // result for our pack. The modern osquery pack schema assigns a UUID
    // `schedule_id` to each query at create-time (see
    // `server/routes/pack/copy_pack_route.ts:88` and
    // `server/routes/unified_history/pack_lookup.ts:34`) — the legacy
    // `pack_default--${packName}_${queryId}` format is only a fallback for docs
    // shipped before schedule_ids were generated server-side. We match rows by
    // `packName` (populated server-side from the pack SO via `packLookup`)
    // instead of guessing the UUID.
    let capturedScheduleId: string | undefined;
    let capturedExecutionCount: number | undefined;

    try {
      const created = await apiServices.osquery.packs.create({
        name: packName,
        enabled: true,
        description: 'scout scheduled pack',
        shards: {},
        policy_ids: [firstPolicyId!],
        queries: {
          // 10 s interval is the minimum the UI allows, and is short enough
          // that a successful execution happens inside our wall-clock budget.
          [queryId]: { ecs_mapping: {}, interval: 10, query: 'select * from uptime;' },
        },
      });
      packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;

      await test.step('scheduled results surface in the history API', async () => {
        // The unified-history aggregation groups by `schedule_id` over
        // `logs-osquery_manager.result-*`. Poll until a row matching our pack
        // name appears — this is the definitive "agent ran it, ES ingested
        // it, Kibana aggregated it" signal. 6 min budget leaves enough
        // headroom for Docker-agent cold starts on CI.
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
            // retry — ES may still be warming up
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
        // Rows carry `data-test-subj="row-${scheduleId}_${executionCount}"`
        // (see `process_scheduled_history.ts`). We know both values from the
        // API step above, so target the exact row to avoid strict-mode
        // duplicate matches when several executions have landed.
        const rowTestSubj = `row-${capturedScheduleId}_${capturedExecutionCount}`;
        await expect(page.testSubj.locator(rowTestSubj)).toBeVisible({ timeout: 60_000 });
      });

      await test.step('scheduled execution details page resolves with real result data', async () => {
        // The scheduled-execution details route is at
        // `/app/osquery/history/scheduled/{scheduleId}/{executionCount}` (see
        // `routes/history/index.tsx`). Navigate there directly using the
        // values captured from the history API — going via the row's Details
        // button in the `UnifiedHistoryTable` fights EUI's actions-on-hover
        // behaviour for no additional coverage. The route resolution +
        // `<PackQueriesStatusTable>` mount is what we want to exercise.
        await page.gotoApp(
          `osquery/history/scheduled/${capturedScheduleId}/${capturedExecutionCount}`
        );

        // Page-load signal: the "Query results" header on the details page.
        await expect(page.getByRole('heading', { name: 'Query results' })).toBeVisible({
          timeout: 60_000,
        });

        // The pack name is rendered as an `EuiBadge` next to the query ID —
        // asserting the badge is visible ties the rendered page specifically
        // to OUR pack (the page shell itself is generic).
        await expect(page.getByText(packName, { exact: true })).toBeVisible({ timeout: 30_000 });

        // The details page mounts the result data grid with one row per agent
        // that shipped a result for this execution. Asserting that the
        // enrolled Docker agent's hostname renders confirms:
        //   - the aggregation found the agent's doc for this schedule_id + exec count
        //   - `<PackQueriesStatusTable>` mounted and the data grid rendered
        // `scout-osquery-agent-0` / `scout-osquery-agent-1` are provisioned
        // by `global.setup.ts`; either one is sufficient.
        await expect(page.getByText(/scout-osquery-agent-[01]/)).toBeVisible({ timeout: 30_000 });
      });
    } finally {
      if (packId) {
        await apiServices.osquery.packs.delete(packId).catch(() => {});
      }
    }
  });
});
