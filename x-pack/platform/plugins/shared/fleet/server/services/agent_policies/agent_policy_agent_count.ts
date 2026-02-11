/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

import { AGENT_POLICY_VERSION_SEPARATOR } from '../../../common/constants';
import { AGENTS_INDEX } from '../../../common';

/**
 * Given a list of Agent Policy IDs (parent policy ids), returns the count of active agents
 * assigned to each policy or any of its version-specific policies (e.g. policy1 and policy1#9.3).
 * @param esClient
 * @param agentPolicyIds parent agent policy ids
 */
export const getAgentCountForAgentPolicies = async (
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<Record<string, number>> => {
  if (agentPolicyIds.length === 0) {
    return {};
  }

  const filters: Record<string, QueryDslQueryContainer> = {};
  for (const policyId of agentPolicyIds) {
    filters[policyId] = {
      bool: {
        should: [
          { term: { policy_id: policyId } },
          { prefix: { policy_id: `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}` } },
        ],
        minimum_should_match: 1,
      },
    };
  }

  const searchPromise = esClient.search<
    unknown,
    Record<'agent_counts', { buckets: Record<string, { doc_count: number }> }>
  >({
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    query: {
      bool: {
        filter: [
          {
            term: {
              active: 'true',
            },
          },
        ],
      },
    },
    aggs: {
      agent_counts: {
        filters: {
          filters,
        },
      },
    },
    size: 0,
  });

  const response: Record<string, number> = agentPolicyIds.reduce<Record<string, number>>(
    (acc, agentPolicyId) => {
      acc[agentPolicyId] = 0;
      return acc;
    },
    {}
  );

  const searchResponse = await searchPromise;

  if (searchResponse.aggregations?.agent_counts.buckets) {
    const buckets = searchResponse.aggregations?.agent_counts.buckets;

    for (const [agentPolicyId, bucket] of Object.entries(buckets)) {
      response[agentPolicyId] = bucket.doc_count;
    }
  }

  return response;
};
