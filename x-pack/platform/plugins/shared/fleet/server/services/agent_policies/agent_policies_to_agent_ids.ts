/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENTS_INDEX } from '../../../common';

/**
 * Given a list of Agent Policy IDs, an array will be returned with
 * the ids of the agents using that agent policy.
 * @param esClient
 * @param agentPolicyIds
 */
export const getAgentIdsForAgentPolicies = async (
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<string[]> => {
  if (agentPolicyIds.length === 0) {
    return [];
  }

  try {
    const esqlQuery = `FROM ${AGENTS_INDEX} METADATA _id
  | WHERE policy_id IN (${agentPolicyIds.map((a) => `"${a}"`).join(', ')})
  | KEEP _id
  | LIMIT 100`;

    const res = await esClient.esql.query({
      query: esqlQuery,
    });
    return res.values.map((value) => value[0] as string);
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Unknown index')) {
      return [];
    } else {
      throw err;
    }
  }
};
