/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { FleetError } from '../../errors';

import type { Agent } from '../../types';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';

import { createAgentAction, createErrorActionResults } from './actions';
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
  const errors: Record<Agent['id'], Error> = {};
  const now = new Date().toISOString();

  const agentPolicies = await getAgentPolicyForAgents(soClient, agents);
  const protectedAgentPolicies = agentPolicies.filter((agentPolicy) => agentPolicy?.is_protected);

  const agentsToAction: Agent[] = [];
  agents.forEach((agent: Agent) => {
    if (
      agent.policy_id &&
      protectedAgentPolicies.map((policy) => policy.id).includes(agent.policy_id)
    ) {
      errors[agent.id] = new FleetError(
        `Agent ${agent.id} cannot be migrated because it is protected.`
      );
    } else if (agent.components?.some((c) => c.type === 'fleet-server')) {
      errors[agent.id] = new FleetError(
        `Agent ${agent.id} cannot be migrated because it is a fleet-server.`
      );
    } else {
      agentsToAction.push(agent);
    }
  });
  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? agents.length;
  const agentIds = agentsToAction.map((agent) => agent.id);
  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];

  await createAgentAction(esClient, {
    id: actionId,
    agents: agentIds,
    created_at: now,
    type: 'MIGRATE',
    total,
    data: {
      enrollment_token: options.enrollment_token,
      target_uri: options.uri,
      settings: options.settings,
    },
    namespaces,
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'agent does not support migration action'
  );

  return { actionId };
}
