/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENTS_INDEX } from '../../../common';

/**
 * Given a list of Agent Policy IDs, an object will be returned with the agent policy id as the key
 * and the number of active agents using that agent policy.
 * @param esClient
 * @param agentPolicyIds
 */
export const getAgentCountForAgentPolicies = async (
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<Record<string, number>> => {
  if (agentPolicyIds.length === 0) {
    return {};
  }

  const response: Record<string, number> = agentPolicyIds.reduce<Record<string, number>>(
    (acc, agentPolicyId) => {
      acc[agentPolicyId] = 0;
      return acc;
    },
    {}
  );

  try {
    const esqlQuery = `FROM ${AGENTS_INDEX}
  | WHERE policy_id IN (${agentPolicyIds.map((a) => `"${a}"`).join(', ')}) AND active: \"true\"
  | STATS agent_counts = COUNT(*) BY policy_id
  | LIMIT ${agentPolicyIds.length}`;

    const searchResponse = await esClient.esql.query({
      query: esqlQuery,
    });

    for (const [count, policyId] of searchResponse.values) {
      response[policyId as string] = count as number;
    }
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Unknown index')) {
      return response;
    } else {
      throw err;
    }
  }

  return response;
};
