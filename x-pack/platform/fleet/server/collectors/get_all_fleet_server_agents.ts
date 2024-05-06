/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../common';
import { getAgentsByKuery } from '../services/agents';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, AGENTS_PREFIX } from '../constants';

import { packagePolicyService } from '../services/package_policy';

export const getAllFleetServerAgents = async (
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient
) => {
  let packagePolicyData;
  try {
    packagePolicyData = await packagePolicyService.list(soClient, {
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: fleet_server`,
    });
  } catch (error) {
    throw new Error(error.message);
  }
  const agentPoliciesIds = packagePolicyData?.items.map((item) => item.policy_id);

  if (agentPoliciesIds.length === 0) {
    return [];
  }

  let agentsResponse;
  try {
    agentsResponse = await getAgentsByKuery(esClient, soClient, {
      showInactive: false,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${AGENTS_PREFIX}.policy_id:${agentPoliciesIds.map((id) => `"${id}"`).join(' or ')}`,
    });
  } catch (error) {
    throw new Error(error.message);
  }

  const { agents: fleetServerAgents } = agentsResponse;

  if (fleetServerAgents.length === 0) {
    return [];
  }
  return fleetServerAgents;
};
