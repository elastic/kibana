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
import { mockFleetAgents } from '../helpers/data_loaders';
import type { AgentsResponse } from '../helpers/data_loaders/mock_fleet_agents';

/**
 * Tier-B contract test for `mockFleetAgents`.
 *
 * Fetches the live response from `GET /internal/osquery/fleet_wrapper/agents`
 * (real Fleet Server + enrolled Elastic Agent) and diffs the field shape
 * against the mock payload `mockFleetAgents(page, { count: 1 })` synthesizes.
 * Fails fast when the real payload gains a field the mock does not emit (or
 * vice versa) so Tier-A specs don't silently mask UI bugs caused by drift in
 * the Fleet wrapper's serialization.
 *
 * Why nightly-only: this spec needs the real backend response to compare
 * against. Running it in the PR pipeline would re-introduce the Docker
 * dependency we just removed.
 */
test.describe(
  'mockFleetAgents contract vs real Fleet wrapper response',
  { tag: OSQUERY_SCOUT_PARALLEL_UI_TARGET_TAGS },
  () => {
    test('top-level, agents[0], and groups field shapes match the live response', async ({
      browserAuth,
      kbnClient,
      page,
    }) => {
      // 4 min: wait-for-agent + two round trips + diff.
      test.setTimeout(240_000);

      await waitForAtLeastOneAgentOnline(kbnClient, { expectedCount: 1, timeoutMs: 240_000 });

      // 1. Real backend response. We log in via the browser to ensure the kbnClient
      //    fetch path goes through the same authn/authz the picker uses.
      await browserAuth.loginAsOsqueryPowerUser();

      const realResp = await kbnClient.request<AgentsResponse>({
        method: 'GET',
        path: '/internal/osquery/fleet_wrapper/agents',
        query: { perPage: 100 },
        headers: { 'elastic-api-version': '1' },
      });
      const real = realResp.data;

      // 2. Mock payload. We install on a throwaway page; the route handlers are
      //    not consumed (we read the returned response object directly), but
      //    `page.route` is what our other specs use, so installing through the
      //    same code path is the truer contract check.
      const { agentsResponse: mock } = await mockFleetAgents(page, { count: 1 });

      // 3. Diff top-level fields.
      const realTopKeys = new Set(Object.keys(real));
      const mockTopKeys = new Set(Object.keys(mock));
      const missingInMock = [...realTopKeys].filter((k) => !mockTopKeys.has(k));
      const missingInReal = [...mockTopKeys].filter((k) => !realTopKeys.has(k));

      expect(
        missingInMock,
        `mockFleetAgents is missing top-level fields present in the real response: ${missingInMock.join(
          ', '
        )}`
      ).toStrictEqual([]);
      expect(
        missingInReal,
        `mockFleetAgents adds top-level fields the real response does not have: ${missingInReal.join(
          ', '
        )}`
      ).toStrictEqual([]);

      // 4. Diff `agents[0]` keys. Both sides are guaranteed non-empty:
      //    - real: enforced by `waitForAtLeastOneAgentOnline` above.
      //    - mock: requested `count: 1` above.
      expect(real.agents.length).toBeGreaterThanOrEqual(1);
      expect(mock.agents.length).toBeGreaterThanOrEqual(1);

      const realAgentKeys = new Set(Object.keys(real.agents[0]));
      const mockAgentKeys = new Set(Object.keys(mock.agents[0]));
      const missingInMockAgent = [...realAgentKeys].filter((k) => !mockAgentKeys.has(k));
      const missingInRealAgent = [...mockAgentKeys].filter((k) => !realAgentKeys.has(k));

      expect(
        missingInMockAgent,
        `mockFleetAgents agent record is missing fields present in real agent record: ${missingInMockAgent.join(
          ', '
        )}`
      ).toStrictEqual([]);
      expect(
        missingInRealAgent,
        `mockFleetAgents agent record adds fields not present in real agent record: ${missingInRealAgent.join(
          ', '
        )}`
      ).toStrictEqual([]);

      // Diff `local_metadata` sub-keys — the picker reads `host`, `os`, `elastic` from here.
      const realLocalKeys = new Set(Object.keys(real.agents[0].local_metadata ?? {}));
      const mockLocalKeys = new Set(Object.keys(mock.agents[0].local_metadata ?? {}));
      const localOnlyReal = [...realLocalKeys].filter((k) => !mockLocalKeys.has(k));

      expect(
        localOnlyReal,
        `mockFleetAgents local_metadata is missing keys present in real local_metadata: ${localOnlyReal.join(
          ', '
        )}`
      ).toStrictEqual([]);

      // 5. Diff `groups` block keys (platforms, overlap, policies).
      const realGroupsKeys = new Set(Object.keys(real.groups ?? {}));
      const mockGroupsKeys = new Set(Object.keys(mock.groups ?? {}));
      const missingInMockGroups = [...realGroupsKeys].filter((k) => !mockGroupsKeys.has(k));
      const missingInRealGroups = [...mockGroupsKeys].filter((k) => !realGroupsKeys.has(k));

      expect(
        missingInMockGroups,
        `mockFleetAgents groups is missing keys present in real groups: ${missingInMockGroups.join(
          ', '
        )}`
      ).toStrictEqual([]);
      expect(
        missingInRealGroups,
        `mockFleetAgents groups adds keys not present in real groups: ${missingInRealGroups.join(
          ', '
        )}`
      ).toStrictEqual([]);
    });
  }
);
