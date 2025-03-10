/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClient } from '@kbn/core/server';

import { agentPolicyService } from '../services';

import type { NewPackagePolicy } from '../types';

import { getAgentUsage } from './agent_collectors';
import type { AgentUsage } from './agent_collectors';

export const getAgenlessUsage = async (
  soClient?: SavedObjectsClient,
  esClient?: ElasticsearchClient
): Promise<AgentUsage> => {
  if (!soClient) {
    return {
      total_enrolled: 0,
      healthy: 0,
      unhealthy: 0,
      offline: 0,
      inactive: 0,
      unenrolled: 0,
      total_all_statuses: 0,
      updating: 0,
    };
  }

  const agentPolicies = await agentPolicyService.list(soClient, {
    perPage: 1000, // avoiding pagination
    withPackagePolicies: true,
  });

  const agentPolicyIds = agentPolicies.items
    .filter((agentPolicy) =>
      (agentPolicy.package_policies as NewPackagePolicy[]).some(
        (packagePolicy) => packagePolicy.supports_agentless === true
      )
    )
    .map((agentPolicy) => agentPolicy.id);

  return await getAgentUsage(soClient, esClient, agentPolicyIds);
};
