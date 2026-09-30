/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import {
  AgentNotFoundError,
  FleetError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';

import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { agentPolicyService } from '../agent_policy';
import { isAgentRestartSupported, MINIMUM_RESTART_AGENT_VERSION } from '../../../common/services';

import type { Agent } from '../../types';
import type { GetAgentsOptions } from '.';
import { getAgentById, getAgentsById, getAgentsByKuery } from './crud';
import { createAgentAction, createErrorActionResults } from './actions';
import { openPointInTime } from './crud';
import { RestartActionRunner, restartBatch } from './restart_action_runner';

export async function restartAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<{ actionId: string }> {
  const agent = await getAgentById(esClient, soClient, agentId);

  if (!isAgentRestartSupported(agent)) {
    throw new FleetError(
      `Agent ${agentId} does not support the restart action (requires >= ${MINIMUM_RESTART_AGENT_VERSION}).`
    );
  }

  if (agent.policy_id) {
    const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
    if (agentPolicy?.is_managed) {
      throw new HostedAgentPolicyRestrictionRelatedError(
        `Cannot restart agent ${agentId} in hosted agent policy ${agentPolicy.id}`
      );
    }
  }

  const currentSpaceId = getCurrentNamespace(soClient);
  const action = await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'RESTART',
    namespaces: [currentSpaceId],
  });
  return { actionId: action.id };
}

export async function bulkRestartAgents(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions & {
    batchSize?: number;
    includeInactive?: boolean;
  }
): Promise<{ actionId: string }> {
  const currentSpaceId = getCurrentNamespace(soClient);

  if ('agentIds' in options) {
    const uniqueAgentIds = [...new Set(options.agentIds)];
    const maybeAgents = await getAgentsById(esClient, soClient, uniqueAgentIds);
    const missingErrors: Record<Agent['id'], Error> = {};
    const givenAgents: Agent[] = [];
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        missingErrors[maybeAgent.id] = new AgentNotFoundError(`Agent ${maybeAgent.id} not found`);
      } else {
        givenAgents.push(maybeAgent);
      }
    }
    const result = await restartBatch(esClient, soClient, givenAgents, {
      spaceId: currentSpaceId,
      total: uniqueAgentIds.length,
    });
    await createErrorActionResults(esClient, result.actionId, missingErrors, 'agent not found');
    return result;
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;

  const { total } = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    spaceId: currentSpaceId,
    showInactive: options.includeInactive ?? false,
    page: 1,
    perPage: 0,
  });

  if (total <= batchSize) {
    const { agents } = await getAgentsByKuery(esClient, soClient, {
      kuery: options.kuery,
      spaceId: currentSpaceId,
      showInactive: options.includeInactive ?? false,
      page: 1,
      perPage: batchSize,
    });
    return await restartBatch(esClient, soClient, agents, { spaceId: currentSpaceId });
  }

  const runner = new RestartActionRunner(
    esClient,
    soClient,
    {
      ...options,
      batchSize,
      total,
      spaceId: currentSpaceId,
      showInactive: options.includeInactive ?? false,
    },
    { pitId: await openPointInTime(esClient) }
  );
  return await runner.runActionAsyncTask();
}
