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

  if (!outdatedAgentPolicyIds.length) {
    return;
  }

  // Preconfigured fleet server policies must be deployed synchronously so that
  // the fleet server agent can read its policy from ES before setup completes.
  // Scoped to preconfigured policies only (cloud / self-managed setups owned by
  // Kibana) to avoid risk for user-created fleet server policies whose data may
  // be in an unexpected state.
  const fleetServerPoliciesById = new Map(
    agentPolicies
      .filter((p) => (p.is_default_fleet_server || p.has_fleet_server) && p.is_preconfigured)
      .map((p) => [p.id, p])
  );

  const outdatedFleetServerPolicyIds = outdatedAgentPolicyIds.filter(({ id }) =>
    fleetServerPoliciesById.has(id)
  );
  const outdatedRegularPolicyIds = outdatedAgentPolicyIds.filter(
    ({ id }) => !fleetServerPoliciesById.has(id)
  );

  if (outdatedFleetServerPolicyIds.length) {
    // Group by space so we can use the correctly-scoped soClient for each
    const bySpace = new Map<string, string[]>();
    for (const { id, spaceId = 'default' } of outdatedFleetServerPolicyIds) {
      const ids = bySpace.get(spaceId) ?? [];
      ids.push(id);
      bySpace.set(spaceId, ids);
    }

    for (const [spaceId, ids] of bySpace) {
      logger.info(
        `Synchronously deploying fleet server ${
          ids.length === 1 ? 'policy' : 'policies'
        } [${ids.join(', ')}] in space [${spaceId}] during setup`
      );
      await agentPolicyService.deployPolicies(
        appContextService.getInternalUserSOClientForSpaceId(spaceId),
        ids,
        undefined,
        { throwOnAnyError: true }
      );
    }
  }

  if (outdatedRegularPolicyIds.length) {
    return scheduleDeployAgentPoliciesTask(
      appContextService.getTaskManagerStart()!,
      outdatedRegularPolicyIds
    );
  }
}
