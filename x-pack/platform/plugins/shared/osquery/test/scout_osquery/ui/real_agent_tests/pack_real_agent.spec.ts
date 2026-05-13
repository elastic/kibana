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

/**
 * Tier-B real-agent scheduled-pack execution.
 *
 * Configures a pack at a 10s interval against the osquery_manager policy and
 * polls the `logs-osquery_manager.result-default` index for AT LEAST ONE
 * scheduled execution within a 5-minute timeout. The assertion deliberately
 * avoids any specific execution count — the real agent's scheduler is subject
 * to startup drift and host clock skew, so the only stable invariant is
 * "did osquery actually execute the scheduled query at least once".
 *
 * NOTE: Task 5.9 in the design — Fleet/osquery enforces a 10s minimum interval
 * in both serverless and stateful. If a future change raises the floor, bump
 * `PACK_INTERVAL_SECONDS` here and re-budget the timeout proportionally.
 */

const PACK_INTERVAL_SECONDS = 10;
const RESULT_POLL_TIMEOUT_MS = 5 * 60_000;
const RESULT_POLL_INTERVAL_MS = 10_000;
const RESULT_ROWS_INDEX = 'logs-osquery_manager.result-default';

test.describe(
  'Real-agent scheduled pack execution',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    let packId: string | undefined;

    test.afterAll(async ({ apiServices }) => {
      if (packId) {
        await apiServices.osquery.packs.delete(packId);
      }
    });

    test('observes at least one scheduled execution from a 10s pack within 5 minutes', async ({
      apiServices,
      esClient,
      kbnClient,
    }) => {
      // 7 min: enrollment + pack apply + agent reconcile + scheduled execution + ingest.
      test.setTimeout(420_000);

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 1, timeoutMs: 240_000 });

      const policiesResponse = await apiServices.osquery.packs.listFleetWrapperPackagePolicies();
      const firstPolicyId = (policiesResponse.data as { items: Array<{ policy_ids: string[] }> })
        .items[0]?.policy_ids?.[0];
      expect(firstPolicyId).toBeDefined();

      const packName = `scout-real-pack-${Date.now()}`;
      const queryKey = 'scout_real_uptime';
      const created = await apiServices.osquery.packs.create({
        name: packName,
        enabled: true,
        description: 'scout real-agent pack scheduled execution',
        shards: {},
        policy_ids: [firstPolicyId!],
        queries: {
          [queryKey]: {
            ecs_mapping: {},
            interval: PACK_INTERVAL_SECONDS,
            platform: 'linux,darwin,windows',
            query: 'SELECT * FROM uptime;',
          },
        },
      });
      packId = (created.data as { data: { saved_object_id: string } }).data.saved_object_id;

      // Poll the results index for at least one scheduled execution row.
      // We do NOT assert execution_count; the agent's scheduler drifts on
      // startup and host clock variance, and the design explicitly says
      // "at least one" is the stable signal.
      const deadline = Date.now() + RESULT_POLL_TIMEOUT_MS;
      let observed = 0;

      while (Date.now() < deadline) {
        const searchResult = await esClient.search({
          index: RESULT_ROWS_INDEX,
          size: 1,
          query: {
            bool: {
              must: [{ term: { 'osquery.action_id': packId } }],
              should: [
                { exists: { field: 'osquery_meta.schedule_execution_count' } },
                { exists: { field: 'schedule_id' } },
              ],
              minimum_should_match: 1,
            },
          },
        });

        const total =
          typeof searchResult.hits.total === 'number'
            ? searchResult.hits.total
            : searchResult.hits.total?.value ?? 0;
        if (total > 0) {
          observed = total;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, RESULT_POLL_INTERVAL_MS));
      }

      expect(
        observed,
        `Expected at least one scheduled-pack execution for "${packName}" within ${
          RESULT_POLL_TIMEOUT_MS / 1000
        }s`
      ).toBeGreaterThanOrEqual(1);
    });
  }
);
