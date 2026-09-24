/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { chunk } from 'lodash';

import { AGENT_POLICY_INDEX, AGENTS_INDEX } from '../../../common';
import type { AgentPolicySOAttributes } from '../../types';
import { appContextService } from '../../services';
import { getAgentPolicySavedObjectType } from '../../services/agent_policy';
import { isSpaceAwarenessEnabled } from '../../services/spaces/helpers';

import type { Context } from './types';

// Maximum number of distinct policy_base_id values to fetch in one aggregation. In practice
// the number of distinct policies should be well below this; it exists as a safety cap so the
// terms aggregation never requests an unbounded bucket list.
const MAX_DISTINCT_POLICY_IDS = 10_000;

// Number of policy IDs to check per soClient.bulkGet call.
const BATCH_SIZE = 500;

export interface SweepOrphanedFleetPoliciesResult {
  deletedCount: number;
}

/**
 * Scans .fleet-policies for documents whose policy_base_id no longer corresponds to any
 * existing agent-policy saved object (orphaned documents) and deletes them.
 *
 * This catches policies deleted via the saved-objects API directly (bypassing
 * agentPolicyService.delete) or cases where the .fleet-policies cleanup step failed
 * transiently during a previous delete attempt.
 *
 * Safety guards:
 * - Uses policy_base_id (written by deployPolicies) for both the aggregation and the delete
 *   filter — avoids the open-ended prefix query and incorrect suffix-stripping that
 *   buildPolicyIdsOrVariantsEsFilter / removeVersionSuffixFromPolicyId would introduce for
 *   policy IDs that legitimately contain '#'.
 * - Uses namespaces: ['*'] on the SO bulkGet only when space awareness is enabled, matching
 *   the pattern Fleet uses elsewhere (agnostic SO types reject namespaces).
 * - Skips any orphan candidate that still has active agents assigned, as a last-resort guard
 *   against incorrect deletion from a bug in the SO liveness check.
 * - Applies conflicts: 'proceed' and max_docs on the deleteByQuery to match the bounds used
 *   by the sibling delete_policy_revisions helper.
 */
export const sweepOrphanedFleetPolicies = async (
  esClient: ElasticsearchClient,
  context: Context
): Promise<SweepOrphanedFleetPoliciesResult> => {
  const { logger, signal } = context;

  const { baseIds, truncated } = await getDistinctBasePolicyIds(esClient, context);

  if (truncated) {
    logger.warn(
      `[sweepOrphanedFleetPolicies] More than ${MAX_DISTINCT_POLICY_IDS} distinct policy_base_id values found in .fleet-policies — ` +
        `the sweep is processing only the first ${MAX_DISTINCT_POLICY_IDS}. ` +
        `Remaining orphans will be caught on subsequent runs.`
    );
  }

  if (baseIds.length === 0) {
    logger.debug(
      '[sweepOrphanedFleetPolicies] No policy IDs in .fleet-policies, nothing to sweep.'
    );
    return { deletedCount: 0 };
  }

  logger.debug(
    `[sweepOrphanedFleetPolicies] Found ${baseIds.length} distinct base policy IDs in .fleet-policies`
  );

  const candidateOrphanedIds = await findOrphanedPolicyIds(baseIds, logger);

  if (candidateOrphanedIds.length === 0) {
    logger.debug('[sweepOrphanedFleetPolicies] No orphaned policy IDs found.');
    return { deletedCount: 0 };
  }

  // Last-resort safety check: skip any candidate that still has active agents assigned.
  // A correctly orphaned policy should have no agents; if agents remain it indicates a bug
  // in the SO liveness check (e.g. a false 404) rather than a genuine orphan.
  const orphanedIds = await filterOutPoliciesWithAgents(
    esClient,
    candidateOrphanedIds,
    logger,
    signal
  );

  if (orphanedIds.length === 0) {
    logger.debug(
      '[sweepOrphanedFleetPolicies] All candidate orphans still have active agents — skipping deletion.'
    );
    return { deletedCount: 0 };
  }

  logger.info(
    `[sweepOrphanedFleetPolicies] Found ${orphanedIds.length} orphaned policy IDs, deleting their .fleet-policies documents.`
  );

  const result = await esClient.deleteByQuery(
    {
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      conflicts: 'proceed',
      max_docs: context.config.maxDocsToDelete,
      wait_for_completion: true,
      // Delete on policy_base_id (exact terms, no prefix), which is written by deployPolicies
      // for both base and version-specific variant documents.
      query: { terms: { policy_base_id: orphanedIds } },
    },
    { signal }
  );

  const deletedCount = result.deleted ?? 0;

  logger.info(
    `[sweepOrphanedFleetPolicies] Deleted ${deletedCount} orphaned .fleet-policies documents.`
  );

  return { deletedCount };
};

/**
 * Queries .fleet-policies to collect all distinct policy_base_id values.
 * Returns the list of base IDs and a flag indicating whether the result was truncated.
 */
async function getDistinctBasePolicyIds(
  esClient: ElasticsearchClient,
  context: Pick<Context, 'signal'>
): Promise<{ baseIds: string[]; truncated: boolean }> {
  interface Aggregations {
    base_policy_ids: {
      buckets: Array<{ key: string }>;
      sum_other_doc_count: number;
    };
  }

  const res = await esClient.search<unknown, Aggregations>(
    {
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      size: 0,
      aggs: {
        base_policy_ids: {
          terms: {
            field: 'policy_base_id',
            size: MAX_DISTINCT_POLICY_IDS,
          },
        },
      },
    },
    { signal: context.signal }
  );

  const agg = res.aggregations?.base_policy_ids;
  const buckets = agg?.buckets ?? [];
  const truncated = (agg?.sum_other_doc_count ?? 0) > 0;
  return { baseIds: buckets.map(({ key }) => key), truncated };
}

/**
 * Given a list of base policy IDs, returns the subset that have no corresponding
 * agent-policy saved object (i.e. the policy has been deleted).
 *
 * In space-aware deployments, uses namespaces: ['*'] so policies in non-default spaces
 * are found and not incorrectly classified as orphans.
 */
async function findOrphanedPolicyIds(allBaseIds: string[], logger: Logger): Promise<string[]> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const [savedObjectType, useSpaceAwareness] = await Promise.all([
    getAgentPolicySavedObjectType(),
    isSpaceAwarenessEnabled(),
  ]);
  const orphanedIds: string[] = [];

  for (const batch of chunk(allBaseIds, BATCH_SIZE)) {
    const bulkGetResult = await soClient.bulkGet<AgentPolicySOAttributes>(
      batch.map((id) => ({
        type: savedObjectType,
        id,
        // Only pass namespaces when space awareness is on — agnostic SO types reject the field.
        ...(useSpaceAwareness ? { namespaces: ['*'] } : {}),
      }))
    );

    for (const item of bulkGetResult.saved_objects) {
      if (isSavedObjectErrorResult(item)) {
        if (item.error.statusCode === 404) {
          // Policy has been deleted; its .fleet-policies docs are orphaned
          orphanedIds.push(item.id);
        } else {
          // Unexpected error: skip this ID to avoid incorrectly deleting live policies
          logger.warn(
            `[sweepOrphanedFleetPolicies] Skipping policy_id "${item.id}" due to unexpected error checking saved object: ${item.error.message}`
          );
        }
      }
    }
  }

  return orphanedIds;
}

/**
 * Filters out any policy IDs that still have active agents assigned.
 * A true orphan (deleted policy) should have no agents — if any exist, it signals a bug
 * in the liveness check rather than a genuine orphan, and deleting would be unsafe.
 */
async function filterOutPoliciesWithAgents(
  esClient: ElasticsearchClient,
  candidateIds: string[],
  logger: Logger,
  signal?: AbortSignal
): Promise<string[]> {
  interface Aggregations {
    active_policy_ids: {
      buckets: Array<{ key: string }>;
    };
  }

  const res = await esClient.search<unknown, Aggregations>(
    {
      index: AGENTS_INDEX,
      ignore_unavailable: true,
      size: 0,
      query: {
        bool: {
          filter: [{ term: { active: true } }, { terms: { policy_id: candidateIds } }],
        },
      },
      aggs: {
        active_policy_ids: {
          terms: { field: 'policy_id', size: candidateIds.length },
        },
      },
    },
    { signal }
  );

  const policyIdsWithAgents = new Set(
    res.aggregations?.active_policy_ids.buckets.map((b) => b.key) ?? []
  );

  if (policyIdsWithAgents.size > 0) {
    logger.warn(
      `[sweepOrphanedFleetPolicies] ${policyIdsWithAgents.size} orphan candidate(s) still have active agents — skipping deletion for safety: ` +
        `${[...policyIdsWithAgents].join(', ')}`
    );
  }

  return candidateIds.filter((id) => !policyIdsWithAgents.has(id));
}
