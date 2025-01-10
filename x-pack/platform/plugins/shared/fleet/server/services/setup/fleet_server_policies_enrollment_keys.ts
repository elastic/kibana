/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import pMap from 'p-map';

import { agentPolicyService } from '../agent_policy';
import { ensureDefaultEnrollmentAPIKeyForAgentPolicy } from '../api_keys';
import { SO_SEARCH_LIMIT, MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20 } from '../../constants';
import { appContextService } from '../app_context';
import { scheduleDeployAgentPoliciesTask } from '../agent_policies/deploy_agent_policies_task';
import { scheduleBumpAgentPoliciesTask } from '../agent_policies/bump_agent_policies_task';

export async function ensureAgentPoliciesFleetServerKeysAndPolicies({
  logger,
  soClient,
  esClient,
}: {
  logger: Logger;
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
}) {
  const security = appContextService.getSecurity();
  if (!security) {
    return;
  }

  if (!(await security.authc.apiKeys.areAPIKeysEnabled())) {
    return;
  }

  const { items: agentPolicies } = await agentPolicyService.list(soClient, {
    perPage: SO_SEARCH_LIMIT,
  });

  const outdatedAgentPolicyIds: Array<{ id: string; spaceId?: string }> = [];
  await pMap(
    agentPolicies,
    async (agentPolicy) => {
      const [latestFleetPolicy] = await Promise.all([
        agentPolicyService.getLatestFleetPolicy(esClient, agentPolicy.id),
        ensureDefaultEnrollmentAPIKeyForAgentPolicy(soClient, esClient, agentPolicy.id),
      ]);

      if ((latestFleetPolicy?.revision_idx ?? -1) < agentPolicy.revision) {
        outdatedAgentPolicyIds.push({ id: agentPolicy.id, spaceId: agentPolicy.space_ids?.[0] });
      }
    },
    {
      concurrency: MAX_CONCURRENT_AGENT_POLICIES_OPERATIONS_20,
    }
  );

  await scheduleBumpAgentPoliciesTask(appContextService.getTaskManagerStart()!);

  if (outdatedAgentPolicyIds.length) {
    if (appContextService.getExperimentalFeatures().asyncDeployPolicies) {
      return scheduleDeployAgentPoliciesTask(
        appContextService.getTaskManagerStart()!,
        outdatedAgentPolicyIds
      );
    } else {
      return agentPolicyService
        .deployPolicies(
          soClient,
          outdatedAgentPolicyIds.map(({ id }) => id)
        )
        .catch((error) => {
          logger.warn(`Error deploying policies: ${error.message}`, { error });
        });
    }
  }
}
