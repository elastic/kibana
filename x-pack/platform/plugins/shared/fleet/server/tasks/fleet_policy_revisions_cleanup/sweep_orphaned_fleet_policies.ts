/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { chunk } from 'lodash';

import { AGENT_POLICY_INDEX } from '../../../common';
import {
  buildPolicyIdsOrVariantsEsFilter,
  removeVersionSuffixFromPolicyId,
} from '../../../common/services/version_specific_policies_utils';
import type { AgentPolicySOAttributes } from '../../types';
import { appContextService } from '../../services';
import { getAgentPolicySavedObjectType } from '../../services/agent_policy';

// Maximum number of distinct policy_id values to fetch from .fleet-policies in one aggregation.
// In practice the number of distinct policy IDs should be well below this; it exists as a
// safety cap so the terms aggregation never requests an unbounded bucket list.
const MAX_DISTINCT_POLICY_IDS = 10_000;

// Number of policy IDs to check per soClient.bulkGet call.
const BATCH_SIZE = 500;

export interface SweepOrphanedFleetPoliciesResult {
  deletedCount: number;
}

/**
 * Scans .fleet-policies for documents whose base policy_id no longer corresponds to any
 * existing agent-policy saved object (orphaned documents) and deletes them.
 *
 * This catches policies deleted via the saved-objects API directly (bypassing
 * agentPolicyService.delete) or cases where the .fleet-policies cleanup step failed
 * transiently during a previous delete attempt.
 */
export const sweepOrphanedFleetPolicies = async (
  esClient: ElasticsearchClient,
  context: { logger: Logger; signal?: AbortSignal }
): Promise<SweepOrphanedFleetPoliciesResult> => {
  const { logger } = context;

  const allBaseIds = await getDistinctBasePolicyIds(esClient, context);

  if (allBaseIds.length === 0) {
    logger.debug(
      '[sweepOrphanedFleetPolicies] No policy IDs in .fleet-policies, nothing to sweep.'
    );
    return { deletedCount: 0 };
  }

  logger.debug(
    `[sweepOrphanedFleetPolicies] Found ${allBaseIds.length} distinct base policy IDs in .fleet-policies`
  );

  const orphanedIds = await findOrphanedPolicyIds(allBaseIds, logger);

  if (orphanedIds.length === 0) {
    logger.debug('[sweepOrphanedFleetPolicies] No orphaned policy IDs found.');
    return { deletedCount: 0 };
  }

  logger.info(
    `[sweepOrphanedFleetPolicies] Found ${orphanedIds.length} orphaned policy IDs, deleting their .fleet-policies documents.`
  );

  const result = await esClient.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    refresh: true,
    query: buildPolicyIdsOrVariantsEsFilter(orphanedIds),
  });

  const deletedCount = result.deleted ?? 0;

  logger.info(
    `[sweepOrphanedFleetPolicies] Deleted ${deletedCount} orphaned .fleet-policies documents.`
  );

  return { deletedCount };
};

/**
 * Queries .fleet-policies to collect all distinct policy_id values, then strips any
 * version suffix (e.g. "policy-id#8.14" → "policy-id") and deduplicates.
 */
async function getDistinctBasePolicyIds(
  esClient: ElasticsearchClient,
  context: { signal?: AbortSignal }
): Promise<string[]> {
  interface Aggregations {
    policy_ids: {
      buckets: Array<{ key: string }>;
    };
  }

  const res = await esClient.search<unknown, Aggregations>(
    {
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      size: 0,
      aggs: {
        policy_ids: {
          terms: {
            field: 'policy_id',
            size: MAX_DISTINCT_POLICY_IDS,
            execution_hint: 'map',
          },
        },
      },
    },
    { signal: context.signal }
  );

  const buckets = res.aggregations?.policy_ids.buckets ?? [];
  const baseIdSet = new Set(buckets.map(({ key }) => removeVersionSuffixFromPolicyId(key)));
  return Array.from(baseIdSet);
}

/**
 * Given a list of base policy IDs, returns the subset that have no corresponding
 * agent-policy saved object (i.e. the policy has been deleted).
 */
async function findOrphanedPolicyIds(allBaseIds: string[], logger: Logger): Promise<string[]> {
  const soClient = appContextService.getInternalUserSOClientWithoutSpaceExtension();
  const savedObjectType = await getAgentPolicySavedObjectType();
  const orphanedIds: string[] = [];

  for (const batch of chunk(allBaseIds, BATCH_SIZE)) {
    const bulkGetResult = await soClient.bulkGet<AgentPolicySOAttributes>(
      batch.map((id) => ({ type: savedObjectType, id }))
    );

    for (const item of bulkGetResult.saved_objects) {
      if (isSavedObjectErrorResult(item)) {
        if (item.error.statusCode === 404) {
          // Policy has been deleted; its .fleet-policies docs are orphaned
          orphanedIds.push(item.id);
        } else {
          // Unexpected error: skip this ID to avoid incorrectly deleting live policies
          logger.warn(
            `[sweepOrphanedFleetPolicies] Skipping policy_id "${item.id}" due to unexpected error when checking saved object: ${item.error.message}`
          );
        }
      }
    }
  }

  return orphanedIds;
}
