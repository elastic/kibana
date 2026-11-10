/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import type { AgentPendingRestart } from '../../../common/types';
import {
  AgentlessAgentRestrictionError,
  AgentRestartPendingError,
  HostedAgentPolicyRestrictionRelatedError,
  FleetError,
} from '../../errors';
import { appContextService } from '../app_context';
import { isAgentRestartSupported, MINIMUM_RESTART_AGENT_VERSION } from '../../../common/services';

import { ActionRunner } from './action_runner';
import { createAgentAction, createErrorActionResults } from './actions';
import { BulkActionTaskType } from './bulk_action_types';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';
import { getPendingRestartActions } from './pending_restart';

export class RestartActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await restartBatch(this.esClient, this.soClient, agents, this.actionParams!);
  }

  protected getTaskType() {
    return BulkActionTaskType.RESTART_RETRY;
  }

  protected getActionType() {
    return 'RESTART';
  }
}

export async function restartBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  givenAgents: Agent[],
  options: {
    actionId?: string;
    total?: number;
    spaceId?: string;
    force?: boolean;
  }
): Promise<{ actionId: string }> {
  const now = new Date().toISOString();
  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;

  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];
  const internalSoClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const restrictions = await getAgentPolicyRestrictions(internalSoClient, givenAgents);

  const errors: Record<Agent['id'], Error> = {};
  const eligibleAgents: Agent[] = [];
  const pendingRestarts = options.force
    ? new Map<string, AgentPendingRestart>()
    : await getPendingRestartActions(
        esClient,
        givenAgents.map((agent) => agent.id),
        // a retried batch must not treat its own, already written action as pending
        { excludeActionId: actionId }
      );

  for (const agent of givenAgents) {
    if (isHostedAgent(restrictions, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot restart agent in hosted agent policy ${agent.policy_id}`
      );
    } else if (isAgentlessAgent(restrictions, agent)) {
      errors[agent.id] = new AgentlessAgentRestrictionError(
        `Cannot restart managed agent ${agent.id}`
      );
    } else if (!isAgentRestartSupported(agent)) {
      errors[agent.id] = new FleetError(
        `Agent ${agent.id} does not support the restart action (requires >= ${MINIMUM_RESTART_AGENT_VERSION}).`
      );
    } else if (pendingRestarts.has(agent.id)) {
      errors[agent.id] = new AgentRestartPendingError(
        `Agent ${agent.id} already has a pending restart action ${
          pendingRestarts.get(agent.id)?.action_id
        }`
      );
    } else {
      eligibleAgents.push(agent);
    }
  }

  await createAgentAction(esClient, internalSoClient, {
    id: actionId,
    agents: eligibleAgents.map((agent) => agent.id),
    created_at: now,
    type: 'RESTART',
    total,
    namespaces,
  });

  await createErrorActionResults(esClient, actionId, errors, 'restart validation failed');

  return { actionId };
}
