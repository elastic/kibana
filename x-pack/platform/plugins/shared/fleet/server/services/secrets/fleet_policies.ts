/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { AGENT_POLICY_INDEX } from '../../../common';
import { appContextService } from '../app_context';

/**
 * Determines which of the given secret ids are still referenced by the **latest**
 * compiled agent policy document in .fleet-policies, scoped to the provided agent
 * policy ids.
 *
 * The .fleet-policies index is ES-managed and maps `data` as { enabled: false } —
 * it cannot be queried by field; we must fetch _source and filter in Kibana.
 *
 * Only the latest revision per policy is consulted. Older revision_idx documents
 * naturally still carry the previous secret_references — consulting them would
 * permanently block deletion of any rotated secret, since a prior revision always
 * references the old value. Fleet-server serves only the latest revision to agents;
 * older revisions are harmless and are swept by sweepOrphanedFleetPolicies.
 *
 * Scoping by agentPolicyIds keeps the query bounded. The crash-loop scenario
 * (an older revision_idx document referencing a just-deleted secret) always involves
 * a policy we already know about at the call site.
 *
 * Returns checkFailed: true when we cannot safely determine the set of references
 * (empty agentPolicyIds, ES error). Callers must treat this as "do not delete" —
 * leaking a secret is recoverable; deleting a referenced one crashes fleet-server.
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

    // Use terms aggregations to bucket the latest compiled doc per policy, sorted by
    // revision_idx desc. Older revision documents carry the previous secret_references —
    // including them would block deletion of any rotated secret permanently.
    //
    // Two parallel aggs handle the pre-backfill / mixed-version case:
    //   by_policy_base_id — buckets on policy_base_id (current schema, most docs)
    //   by_policy_id      — buckets on policy_id to catch docs written before
    //                       backfill_policy_base_id ran (policy_base_id absent/null).
    // Modern docs have both fields so they appear in both aggs; duplicates are harmless
    // because we union into a Set. Do NOT use a prefix/wildcard on policy_id — see
    // sweep_orphaned_fleet_policies.ts.
    const res = await esClient.search<never>(
      {
        index: AGENT_POLICY_INDEX,
        ignore_unavailable: true,
        size: 0,
        query: {
          bool: {
            should: [
              { terms: { policy_base_id: agentPolicyIds } },
              { terms: { policy_id: agentPolicyIds } },
            ],
            minimum_should_match: 1,
          },
        },
        aggs: {
          by_policy_base_id: {
            terms: {
              field: 'policy_base_id',
              size: agentPolicyIds.length,
            },
            aggs: {
              latest_doc: {
                top_hits: {
                  size: 1,
                  sort: [{ revision_idx: 'desc' }],
                  _source: ['data.secret_references'],
                },
              },
            },
          },
          by_policy_id: {
            terms: {
              field: 'policy_id',
              size: agentPolicyIds.length,
            },
            aggs: {
              latest_doc: {
                top_hits: {
                  size: 1,
                  sort: [{ revision_idx: 'desc' }],
                  _source: ['data.secret_references'],
                },
              },
            },
          },
        },
      },
      // maxRetries: 0 — fail closed immediately on an ES error rather than masking an availability
      // issue with silent retries. A false "no references" verdict deletes a live secret.
      { maxRetries: 0 }
    );

    interface SecretRef {
      id: string;
    }
    interface LatestHit {
      _source: { data?: { secret_references?: SecretRef[] } };
    }
    interface PolicyBucket {
      latest_doc: { hits: { hits: LatestHit[] } };
    }
    interface ByPolicyAgg {
      buckets: PolicyBucket[];
    }

    const collectFromBuckets = (agg: ByPolicyAgg | undefined) => {
      for (const bucket of agg?.buckets ?? []) {
        const hit = bucket.latest_doc.hits.hits[0];
        const secretRefs = hit?._source?.data?.secret_references;
        if (Array.isArray(secretRefs)) {
          for (const ref of secretRefs) {
            if (ref?.id) {
              referencedIds.add(ref.id);
            }
          }
        }
      }
    };

    // Partial shard failures return HTTP 200 with no exception — the catch below won't fire.
    // A failed shard means some compiled docs were not examined; treat it as checkFailed so
    // we never produce a false "no references" verdict that deletes a live secret.
    const shards = res._shards as
      | { total?: number; successful?: number; failed?: number }
      | undefined;
    if ((shards?.failed ?? 0) > 0 || shards?.total !== shards?.successful) {
      logger.warn(
        `[findFleetPoliciesUsingSecrets] Partial shard failure querying .fleet-policies (total=${shards?.total}, successful=${shards?.successful}, failed=${shards?.failed}) — skipping deletion to avoid removing a referenced secret.`
      );
      return { referencedIds: new Set(), checkFailed: true };
    }

    collectFromBuckets(res.aggregations?.by_policy_base_id as ByPolicyAgg | undefined);
    collectFromBuckets(res.aggregations?.by_policy_id as ByPolicyAgg | undefined);

    return { referencedIds, checkFailed: false };
  } catch (e) {
    logger.warn(
      `[findFleetPoliciesUsingSecrets] Failed to check .fleet-policies for secret references: ${e}. Skipping deletion to avoid removing a referenced secret.`
    );
    return { referencedIds: new Set(), checkFailed: true };
  }
}
