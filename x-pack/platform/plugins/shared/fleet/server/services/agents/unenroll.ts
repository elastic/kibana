/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';

import type { Agent } from '../../types';
import {
  AgentlessAgentRestrictionError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';
import { SO_SEARCH_LIMIT } from '../../constants';
import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { agentsKueryNamespaceFilter, buildFilterWithNamespace } from '../spaces/agent_namespaces';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { openPointInTime } from './crud';
import { getAgentsByKuery } from './crud';
import { getAgentById, getAgents, updateAgent, getAgentPolicyForAgent } from './crud';
import {
  invalidateAPIKeysForAgents,
  UnenrollActionRunner,
  unenrollBatch,
  updateActionsForForceUnenroll,
} from './unenroll_action_runner';

async function unenrollAgentIsAllowed(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  options?: {
    skipAgentlessValidation?: boolean;
    skipHostedValidation?: boolean;
  }
) {
  const agentPolicy = await getAgentPolicyForAgent(soClient, esClient, agentId).catch((err) => {
    // a forced unenroll must still work for agents whose policy no longer exists
    if (options?.skipHostedValidation && SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  });
  if (!options?.skipHostedValidation && agentPolicy?.is_managed) {
    throw new HostedAgentPolicyRestrictionRelatedError(
      `Cannot unenroll ${agentId} from a hosted agent policy ${agentPolicy.id}`
    );
  }

  if (!options?.skipAgentlessValidation && agentPolicy?.supports_agentless) {
    throw new AgentlessAgentRestrictionError(`Cannot unenroll managed agent ${agentId}`);
  }

  return true;
}

export async function unenrollAgent(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  agentId: string,
  options?: {
    force?: boolean;
    skipAgentlessValidation?: boolean;
    revoke?: boolean;
  }
) {
  await getAgentById(esClient, soClient, agentId); // throw 404 if agent not in namespace
  // force skips the hosted and agentless validations: escape hatch, for example to remove an
  // orphaned agentless agent
  await unenrollAgentIsAllowed(soClient, esClient, agentId, {
    skipAgentlessValidation: options?.skipAgentlessValidation || options?.force,
    skipHostedValidation: options?.force,
  });
  if (options?.revoke) {
    return forceUnenrollAgent(esClient, soClient, agentId);
  }
  const now = new Date().toISOString();
  const currentSpaceId = getCurrentNamespace(soClient);
  await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: now,
    type: 'UNENROLL',
    namespaces: [currentSpaceId],
  });
  await updateAgent(esClient, agentId, {
    unenrollment_started_at: now,
  });
}

export async function unenrollAgents(
  soClient: SavedObjectsClientContract,
  esClient: ElasticsearchClient,
  options: GetAgentsOptions & {
    force?: boolean;
    revoke?: boolean;
    batchSize?: number;
    showInactive?: boolean;
    dryRun?: boolean;
  }
): Promise<{ actionId: string } | { count: number }> {
  const spaceId = getCurrentNamespace(soClient);

  if ('agentIds' in options) {
    if (options.dryRun) {
      const agents = await getAgents(esClient, soClient, options);
      return { count: agents.length };
    }
    const givenAgents = await getAgents(esClient, soClient, options);
    return await unenrollBatch(soClient, esClient, givenAgents, {
      ...options,
      spaceId,
    });
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
  const namespaceFilter = await agentsKueryNamespaceFilter(spaceId);
  const kuery = buildFilterWithNamespace(namespaceFilter, options.kuery);
  // cheap count — avoids hydrating up to batchSize agent documents just to read the total
  const { total } = await getAgentsByKuery(esClient, soClient, {
    kuery,
    showAgentless: options.showAgentless,
    showInactive: options.showInactive ?? false,
    page: 1,
    perPage: 0,
  });
  if (options.dryRun) {
    return { count: total };
  }
  if (total <= batchSize) {
    const res = await getAgentsByKuery(esClient, soClient, {
      kuery,
      showAgentless: options.showAgentless,
      showInactive: options.showInactive ?? false,
      page: 1,
      perPage: batchSize,
    });
    return await unenrollBatch(soClient, esClient, res.agents, {
      ...options,
      spaceId,
    });
  } else {
    return await new UnenrollActionRunner(
      esClient,
      soClient,
      {
        ...options,
        spaceId,
        batchSize,
        total,
      },
      { pitId: await openPointInTime(esClient) }
    ).runActionAsyncTask();
  }
}

export async function forceUnenrollAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentIdOrAgent: string | Agent
) {
  const agent =
    typeof agentIdOrAgent === 'string'
      ? await getAgentById(esClient, soClient, agentIdOrAgent)
      : agentIdOrAgent;

  await invalidateAPIKeysForAgents([agent]);
  await updateAgent(esClient, agent.id, {
    active: false,
    unenrolled_at: new Date().toISOString(),
  });
  await updateActionsForForceUnenroll(esClient, soClient, [agent.id], uuidv4(), 1);
}
