/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

/**
 * Poll Fleet until at least `expectedCount` agents are in `online`/`degraded` state.
 *
 * `global.setup.ts` enrolls agents and verifies osquery is responsive before tests
 * run, but when a previous test project leaves Fleet in a reconciling state (e.g.
 * after container restarts between `serverless`/`stateful` runs), the first test
 * in a spec can still see `fleet.agents` return an empty set for a few seconds.
 * The osquery `POST /api/osquery/live_queries` endpoint rejects `agent_all: true`
 * with `PARAMETER_NOT_FOUND` (HTTP 400) when no agents match — defensively waiting
 * here is cheaper than a 400-specific retry in every caller.
 */
export async function waitForAtLeastOneAgentOnline(
  kbnClient: KbnClient,
  {
    expectedCount = 1,
    timeoutMs = 120_000,
    pollIntervalMs = 3_000,
  }: {
    expectedCount?: number;
    timeoutMs?: number;
    pollIntervalMs?: number;
  } = {}
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastCount = 0;
  while (Date.now() < deadline) {
    try {
      const { data } = await kbnClient.request<{
        items: Array<{ status: string }>;
      }>({
        method: 'GET',
        path: '/api/fleet/agents',
        query: { perPage: 100 },
      });
      lastCount = data.items.filter(
        (agent) => agent.status === 'online' || agent.status === 'degraded'
      ).length;
      if (lastCount >= expectedCount) return;
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for ${expectedCount} online agent(s); last count was ${lastCount}`
  );
}

interface FleetAgentPolicyItem {
  id: string;
  name: string;
  space_ids?: string[];
}

/**
 * Share the default-space osquery-manager-backed agent policies with an
 * additional space.
 *
 * `global.setup.ts` installs `osquery_manager` only in the `default` space
 * (policies: "Default policy", "Osquery policy"). The osquery UI renders its
 * "Add Osquery Manager" empty state in any space where no osquery_manager
 * package policy is visible — so `custom_space.spec.ts` cannot reach the
 * live-query form unless those existing policies are also visible inside the
 * Scout-created space. We PATCH `space_ids` on each matching policy rather
 * than re-installing the integration, which keeps the enrolled Docker agents
 * reachable from the new space too.
 *
 * Returns a cleanup function that restores each policy to its original
 * `space_ids` — call from `afterAll` to avoid leaking multi-space config
 * across workers.
 */
export async function shareOsqueryPoliciesWithSpace(
  kbnClient: KbnClient,
  spaceId: string
): Promise<() => Promise<void>> {
  if (!spaceId || spaceId === 'default') {
    return async () => {};
  }

  const { data } = await kbnClient.request<{ items: FleetAgentPolicyItem[] }>({
    method: 'GET',
    path: '/api/fleet/agent_policies',
    query: {
      kuery: 'ingest-agent-policies.name:("Default policy" or "Osquery policy")',
      perPage: 50,
    },
  });

  const originals = data.items.map((p) => ({
    id: p.id,
    name: p.name,
    spaceIds: p.space_ids ?? ['default'],
  }));

  await Promise.all(
    originals.map(async (p) => {
      if (p.spaceIds.includes(spaceId)) return;
      await kbnClient.request({
        method: 'PUT',
        path: `/api/fleet/agent_policies/${p.id}`,
        body: {
          name: p.name,
          namespace: 'default',
          space_ids: Array.from(new Set([...p.spaceIds, spaceId])),
        },
      });
    })
  );

  return async () => {
    await Promise.all(
      originals.map((p) =>
        kbnClient
          .request({
            method: 'PUT',
            path: `/api/fleet/agent_policies/${p.id}`,
            body: {
              name: p.name,
              namespace: 'default',
              space_ids: p.spaceIds,
            },
          })
          .catch(() => {})
      )
    );
  };
}
