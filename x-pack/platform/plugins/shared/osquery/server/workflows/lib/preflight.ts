/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPolicyIdKuery } from '../../../common/utils/build_policy_id_kuery';
import type { PlatformId } from '../../../common/constants';
import { PreDispatchErrorCode } from '../../../common/workflows/contract/error_codes';
import { TARGET_AGENT_LIMIT } from '../../../common/workflows/contract/budget';
import type { TargetInput } from '../../../common/workflows/contract/schemas';
import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from './api_headers';
import { stepError, toPreDispatchReadError } from './errors';
import type { KibanaApiCaller } from './types';

const ONLINE_KUERY = '(status:online OR status:degraded)';

/**
 * Fleet platform values go into the live-query route's KQL unescaped. They come from agent
 * metadata, not from the workflow, but are still limited to characters that cannot change the
 * query.
 */
const SAFE_FLEET_PLATFORM = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export interface ResolvedTarget {
  target: TargetInput;
  agentCount: number;
}

interface AgentsResponse {
  total?: number;
  groups?: { platforms?: Array<{ id: string; size: number }> };
}

/**
 * Fleet's `local_metadata.os.platform` holds the distribution (`ubuntu`, `centos`, ...) for Linux
 * agents and `darwin` / `windows` otherwise. An osquery platform id maps to Fleet values:
 * `linux` is every value that is not `darwin` or `windows`.
 */
export const matchesPlatformId = (fleetPlatform: string, platformId: PlatformId): boolean =>
  platformId === 'linux'
    ? fleetPlatform !== 'darwin' && fleetPlatform !== 'windows'
    : fleetPlatform === platformId;

const tooMany = (total: number) =>
  stepError(
    PreDispatchErrorCode.TARGET_LIMIT_EXCEEDED,
    `The selection matches ${total} agents, above the limit of ${TARGET_AGENT_LIMIT}. Narrow it down.`
  );

const readAgents = async (
  contextManager: KibanaApiCaller,
  kuery: string
): Promise<AgentsResponse> => {
  try {
    const { body } = await contextManager.callKibanaApi<AgentsResponse>({
      method: 'GET',
      path: '/internal/osquery/fleet_wrapper/agents',
      query: { kuery, page: 1, perPage: 1 },
      headers: INTERNAL_API_HEADERS,
    });

    return body;
  } catch (error) {
    throw toPreDispatchReadError('Counting the targeted agents', error);
  }
};

/**
 * Turns the step's targeting input into what the live-query route takes, before anything is
 * dispatched:
 * - `agent_ids` is bounded by the schema and passed through.
 * - `agent_policy_ids` is counted against the ceiling. The dispatch POST repeats the check
 *   on the agents the route actually selects, so a short count here cannot fan out past it.
 * - `agent_platforms` (osquery ids) is expanded to the Fleet platform values of the online,
 *   osquery-enabled agents in this space, and counted from the same response.
 *
 * `agentCount` is that count (online agents only), for outputs written when the dispatch
 * response never arrives.
 */
export const resolveTarget = async (
  contextManager: KibanaApiCaller,
  input: TargetInput
): Promise<ResolvedTarget> => {
  if (input.agent_ids) {
    return { target: { agent_ids: input.agent_ids }, agentCount: input.agent_ids.length };
  }

  if (input.agent_policy_ids) {
    const { total = 0 } = await readAgents(
      contextManager,
      `${ONLINE_KUERY} and (${buildPolicyIdKuery(input.agent_policy_ids)})`
    );
    if (total > TARGET_AGENT_LIMIT) throw tooMany(total);

    return { target: { agent_policy_ids: input.agent_policy_ids }, agentCount: total };
  }

  const platformIds = (input.agent_platforms ?? []) as PlatformId[];
  const { groups } = await readAgents(contextManager, ONLINE_KUERY);
  const buckets = (groups?.platforms ?? []).filter(
    (bucket) =>
      SAFE_FLEET_PLATFORM.test(bucket.id) &&
      platformIds.some((platformId) => matchesPlatformId(bucket.id, platformId))
  );

  if (buckets.length === 0) {
    throw stepError(
      PreDispatchErrorCode.AGENTS_NOT_IN_SPACE,
      `No online osquery agent in this space runs on ${platformIds.join(', ')}.`
    );
  }

  const total = buckets.reduce((sum, bucket) => sum + bucket.size, 0);
  if (total > TARGET_AGENT_LIMIT) throw tooMany(total);

  return { target: { agent_platforms: buckets.map((bucket) => bucket.id) }, agentCount: total };
};

/**
 * Fails with `MISSING_PRIVILEGE` when the caller cannot read live queries (`live_queries_read`).
 * Without it the query would still run on every target, but its status and rows could never be
 * read back by this workflow.
 */
export const assertCanReadLiveQueries = async (contextManager: KibanaApiCaller): Promise<void> => {
  try {
    await contextManager.callKibanaApi({
      method: 'GET',
      path: '/api/osquery/live_queries',
      // The route's default sort (`created_at`) is not mapped on the actions index and fails
      // the search; sort like the Live queries UI does.
      query: { pageSize: 1, sort: '@timestamp' },
      headers: PUBLIC_API_HEADERS,
    });
  } catch (error) {
    throw toPreDispatchReadError('Reading live query results (live_queries_read)', error);
  }
};
