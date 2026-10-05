/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError, FleetError } from '../../errors';
import { appContextService } from '../app_context';
import { isAgentRestartSupported, MINIMUM_RESTART_AGENT_VERSION } from '../../../common/services';

import { ActionRunner } from './action_runner';
import { createAgentAction, createErrorActionResults } from './actions';
import { BulkActionTaskType } from './bulk_action_types';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';

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
  }
): Promise<{ actionId: string }> {
  const now = new Date().toISOString();
  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;

  const spaceId = options.spaceId;
  const namespaces = spaceId ? [spaceId] : [];
  const internalSoClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);

  const hostedPolicies = await getHostedPolicies(internalSoClient, givenAgents);

  const errors: Record<Agent['id'], Error> = {};
  const eligibleAgents: Agent[] = [];

  for (const agent of givenAgents) {
    if (isHostedAgent(hostedPolicies, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot restart agent in hosted agent policy ${agent.policy_id}`
      );
    } else if (!isAgentRestartSupported(agent)) {
      errors[agent.id] = new FleetError(
        `Agent ${agent.id} does not support the restart action (requires >= ${MINIMUM_RESTART_AGENT_VERSION}).`
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

  await createErrorActionResults(esClient, actionId, errors, 'restart not supported');

  return { actionId };
}
