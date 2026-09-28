/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { getCurrentNamespace } from '../spaces/get_current_namespace';

import type { GetAgentsOptions } from '.';
import { getAgents, getAgentsByKuery, getAgentPolicyForAgent } from './crud';
import { createAgentAction } from './actions';
import { openPointInTime } from './crud';
import { RestartActionRunner, restartBatch } from './restart_action_runner';

export async function restartAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string
): Promise<{ actionId: string }> {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId);
  if (agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot restart agent ${agentId} in hosted agent policy ${agentPolicy.id}`
    );
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
    const givenAgents = await getAgents(esClient, soClient, options);
    return await restartBatch(esClient, givenAgents, { spaceId: currentSpaceId });
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
    return await restartBatch(esClient, agents, { spaceId: currentSpaceId });
  }

  const runner = new RestartActionRunner(
    esClient,
    soClient,
    {
      ...options,
      batchSize,
      total,
      spaceId: currentSpaceId,
    },
    { pitId: await openPointInTime(esClient) }
  );
  return await runner.processAgentsInBatches();
}
