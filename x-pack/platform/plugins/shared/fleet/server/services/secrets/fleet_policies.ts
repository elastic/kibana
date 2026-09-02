/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { SO_SEARCH_LIMIT, AGENT_POLICY_INDEX } from '../../../common';
import { appContextService } from '../app_context';

/**
 * Determines which of the given secret ids are still referenced by any compiled
 * agent policy document in .fleet-policies, scoped to the provided agent policy ids.
 *
 * The .fleet-policies index is ES-managed and maps `data` as { enabled: false } —
 * it cannot be queried by field; we must fetch _source and filter in Kibana.
 *
 * Scoping by agentPolicyIds is what keeps this bounded. The crash-loop scenario
 * (an older revision_idx document referencing a just-deleted secret) always involves
 * a policy we already know about at the call site. Truly orphaned .fleet-policies docs
 * (issue #282911) belong to deleted agent policies, are never served to fleet-server,
 * and are separately swept by sweepOrphanedFleetPolicies — defending against them
 * would force a full index scan for no safety gain.
 *
 * Returns checkFailed: true when we cannot safely determine the set of references
 * (empty agentPolicyIds, ES error, or result truncation). Callers must treat this
 * as "do not delete" — leaking a secret is recoverable; deleting a referenced one
 * crashes fleet-server.
 */
export async function findFleetPoliciesUsingSecrets(opts: {
  esClient: ElasticsearchClient;
  ids: string[];
  agentPolicyIds: string[];
}): Promise<{ referencedIds: Set<string>; checkFailed: boolean }> {
  const { esClient, ids, agentPolicyIds } = opts;
  const logger = appContextService.getLogger();

  if (agentPolicyIds.length === 0) {
    logger.warn(
      '[findFleetPoliciesUsingSecrets] No agent policy ids provided — cannot scope .fleet-policies query, skipping deletion.'
    );
    return { referencedIds: new Set(), checkFailed: true };
  }

  if (ids.length === 0) {
    return { referencedIds: new Set(), checkFailed: false };
  }

  try {
    const referencedIds = new Set<string>();
    let searchAfter: SortResults | undefined;

    do {
      const res = await esClient.search<{
        data?: { secret_references?: Array<{ id: string }> };
      }>(
        {
          index: AGENT_POLICY_INDEX,
          ignore_unavailable: true,
          size: SO_SEARCH_LIMIT,
          // .fleet-policies maps `data` as { enabled: false } — subfields are stored in _source
          // only and cannot be queried. Fetch only secret_references to keep the payload small.
          _source: ['data.secret_references'],
          // Use both policy_base_id and policy_id so we catch:
          //  - base docs and version-specific variants (policy_base_id, indexed on current ES)
          //  - docs written before backfill_policy_base_id ran (policy_id fallback)
          // Do NOT use a prefix/wildcard on policy_id — see the rationale in sweep_orphaned_fleet_policies.ts.
          query: {
            bool: {
              should: [
                { terms: { policy_base_id: agentPolicyIds } },
                { terms: { policy_id: agentPolicyIds } },
              ],
              minimum_should_match: 1,
            },
          },
          sort: [{ revision_idx: 'asc' }, { policy_id: 'asc' }],
          ...(searchAfter ? { search_after: searchAfter } : {}),
        },
        { maxRetries: 0 }
      );

      const hits = res.hits.hits;

      for (const hit of hits) {
        const secretRefs = hit._source?.data?.secret_references;
        if (Array.isArray(secretRefs)) {
          for (const ref of secretRefs) {
            if (ref?.id) {
              referencedIds.add(ref.id);
            }
          }
        }
      }

      if (hits.length === SO_SEARCH_LIMIT) {
        const last = hits[hits.length - 1];
        searchAfter = last.sort as SortResults;
      } else {
        searchAfter = undefined;
      }
    } while (searchAfter);

    return { referencedIds, checkFailed: false };
  } catch (e) {
    logger.warn(
      `[findFleetPoliciesUsingSecrets] Failed to check .fleet-policies for secret references: ${e}. Skipping deletion to avoid removing a referenced secret.`
    );
    return { referencedIds: new Set(), checkFailed: true };
  }
}
