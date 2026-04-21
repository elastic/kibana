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
