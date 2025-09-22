/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { isAgentMigrationSupported, MINIMUM_MIGRATE_AGENT_VERSION } from '../../../common/services';
import { FleetError, FleetUnauthorizedError } from '../../errors';

import type { AgentPolicy, Agent } from '../../types';

import { getCurrentNamespace } from '../spaces/get_current_namespace';

import { SO_SEARCH_LIMIT } from '../../constants';

import { createAgentAction } from './actions';
import type { GetAgentsOptions } from './crud';
import { getAgents, getAgentsByKuery, openPointInTime } from './crud';

import { MigrateActionRunner, bulkMigrateAgentsBatch } from './migrate_action_runner';

export async function migrateSingleAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string,
  agentPolicy: AgentPolicy | undefined,
  agent: Agent,
  options: {
    policyId?: string;
    enrollment_token: string;
    uri: string;
    settings?: Record<string, any>;
  }
) {
  //  If the agent belongs to a policy that is protected or has fleet-server as a component meaning its a fleet server agent, throw an error
  if (agentPolicy?.is_protected) {
    throw new FleetUnauthorizedError(`Agent is protected and cannot be migrated`);
  }
  if (agent.components?.some((c) => c.type === 'fleet-server')) {
    throw new FleetUnauthorizedError(`Fleet server agents cannot be migrated`);
  }
  if (!isAgentMigrationSupported(agent)) {
    throw new FleetError(
      `Agent cannot be migrated. Migrate action is supported from version ${MINIMUM_MIGRATE_AGENT_VERSION}.`
    );
  }
  const response = await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'MIGRATE',
    policyId: options.policyId,
    data: {
      target_uri: options.uri,
      settings: options.settings,
    },
    ...(options.enrollment_token && {
      secrets: { enrollment_token: options.enrollment_token },
    }),
  });
  return { actionId: response.id };
}

export async function bulkMigrateAgents(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions & {
    batchSize?: number;
    enrollment_token: string;
    uri: string;
    settings?: Record<string, any>;
  }
): Promise<{ actionId: string }> {
  const currentSpaceId = getCurrentNamespace(soClient);

  if ('agentIds' in options) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await bulkMigrateAgentsBatch(esClient, soClient, givenAgents, {
      enrollment_token: options.enrollment_token,
      uri: options.uri,
      settings: options.settings,
      spaceId: currentSpaceId,
    });
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;

  const res = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    spaceId: currentSpaceId,
    showInactive: false,
    page: 1,
    perPage: batchSize,
  });
  if (res.total <= batchSize) {
    return await bulkMigrateAgentsBatch(esClient, soClient, res.agents, {
      enrollment_token: options.enrollment_token,
      uri: options.uri,
      settings: options.settings,
      spaceId: currentSpaceId,
    });
  } else {
    return await new MigrateActionRunner(
      esClient,
      soClient,
      {
        ...options,
        batchSize,
        total: res.total,
        spaceId: currentSpaceId,
      },
      { pitId: await openPointInTime(esClient) }
    ).runActionAsyncTask();
  }
}
