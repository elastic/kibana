/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';

import type { Agent } from '../../types';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';

import { createAgentAction } from './actions';
import { getAgentPolicyForAgents } from './crud';

export class MigrateActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await bulkMigrateAgentsBatch(this.esClient, this.soClient, agents, this.actionParams!);
  }

  protected getTaskType() {
    return BulkActionTaskType.MIGRATE_RETRY;
  }

  protected getActionType() {
    return 'MIGRATE';
  }
}

export async function bulkMigrateAgentsBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
    enrollment_token?: string;
    uri?: string;
    settings?: Record<string, any>;
  }
) {
  const agentPolicies = await getAgentPolicyForAgents(soClient, agents);

  // If any agent is protected or has fleet-server as a component, throw an error
  const protectedAgents = agentPolicies.filter((agentPolicy) => agentPolicy?.is_protected);
  const fleetServerAgents = agents.filter((agent) =>
    agent.components?.some((c) => c.type === 'fleet-server')
  );

  if (protectedAgents.length > 0 || fleetServerAgents.length > 0) {
    throw new FleetUnauthorizedError(
      `One or more agents are ${
        protectedAgents.length > 0 && fleetServerAgents.length > 0
          ? 'protected and fleet-server'
          : protectedAgents.length > 0
          ? 'protected'
          : 'fleet-server'
      } agents and cannot be migrated`
    );
  }
  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? agents.length;
  const agentIds = agents.map((agent) => agent.id);
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];

  const response = await createAgentAction(esClient, {
    id: actionId,
    agents: agentIds,
    created_at: new Date().toISOString(),
    type: 'MIGRATE',
    total,
    data: {
      enrollment_token: options.enrollment_token,
      target_uri: options.uri,
      settings: options.settings,
    },
    namespaces,
    // expiration?
  });
  return { actionId: response.id };
}
