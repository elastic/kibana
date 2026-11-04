/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

import {
  AgentAlreadyAssignedError,
  AgentReassignmentError,
  AgentlessAgentRestrictionError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';

import { appContextService } from '../app_context';

import { agentPolicyService } from '../agent_policy';
import { removeVersionSuffixFromPolicyId } from '../../../common/services/version_specific_policies_utils';

import { ActionRunner } from './action_runner';

import { bulkUpdateAgents } from './crud';
import { createErrorActionResults, createAgentAction } from './actions';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_action_types';

export class ReassignActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await reassignBatch(this.esClient, this.actionParams! as any, agents, {});
  }

  protected getTaskType() {
    return BulkActionTaskType.REASSIGN_RETRY;
  }

  protected getActionType() {
    return 'POLICY_REASSIGN';
  }
}

export async function reassignBatch(
  esClient: ElasticsearchClient,
  options: {
    newAgentPolicyId: string;
    actionId?: string;
    total?: number;
    spaceId?: string;
  },
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>
): Promise<{ actionId: string }> {
  const spaceId = options.spaceId;
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const restrictions = await getAgentPolicyRestrictions(soClient, givenAgents, {
    spaceId: options.spaceId,
  });

  const newAgentPolicy = await agentPolicyService.get(soClient, options.newAgentPolicyId, true, {
    ...(spaceId === '*' ? { spaceId } : {}),
  });
  const newAgentPolicyBaseId = removeVersionSuffixFromPolicyId(options.newAgentPolicyId);

  const agentsToUpdate = givenAgents.reduce<Agent[]>((agents, agent) => {
    if (agent.policy_id === options.newAgentPolicyId) {
      errors[agent.id] = new AgentAlreadyAssignedError(
        `Agent ${agent.id} is already assigned to agent policy ${options.newAgentPolicyId}`
      );
    } else if (isHostedAgent(restrictions, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot reassign an agent from hosted agent policy ${agent.policy_id}`
      );
    } else if (
      (isAgentlessAgent(restrictions, agent) || newAgentPolicy?.supports_agentless) &&
      agent.policy_base_id !== newAgentPolicyBaseId
    ) {
      // agentless agents can only move between variants of their own policy (version-specific policies)
      errors[agent.id] = new AgentlessAgentRestrictionError(
        `Cannot reassign agent ${agent.id} ${
          isAgentlessAgent(restrictions, agent) ? 'from' : 'to'
        } managed agent policy`
      );
    } else {
      agents.push(agent);
    }
    return agents;
  }, []);

  if (agentsToUpdate.length === 0) {
    // early return if all agents failed validation
    appContextService
      .getLogger()
      .debug('No agents to update, skipping agent update and action creation');
    const errorList = Object.values(errors);
    if (errorList.length > 0 && errorList.every((e) => e instanceof AgentAlreadyAssignedError)) {
      throw new AgentAlreadyAssignedError('No agents to reassign, all agents are already assigned');
    }
    throw new AgentReassignmentError('No agents to reassign, already assigned or managed agents');
  }

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        policy_id: options.newAgentPolicyId,
        policy_base_id: removeVersionSuffixFromPolicyId(options.newAgentPolicyId),
        policy_revision: null,
        ...(newAgentPolicy?.space_ids ? { namespaces: newAgentPolicy.space_ids } : {}),
      },
    })),
    errors
  );

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;
  const now = new Date().toISOString();
  // For cross-space task calls (spaceId === '*'), scope the action to the target policy's actual
  // spaces. ALL_SPACES_ID ('*') in space_ids is valid here: Fleet's action query filter
  // (query_namespaces_filtering.ts) includes '*' in every per-space terms query, so an action
  // with namespaces: ['*'] surfaces in all spaces.
  const namespaces = spaceId && spaceId !== '*' ? [spaceId] : newAgentPolicy?.space_ids ?? [];

  await createAgentAction(esClient, soClient, {
    id: actionId,
    agents: agentsToUpdate.map((agent) => agent.id),
    created_at: now,
    type: 'POLICY_REASSIGN',
    total,
    data: {
      policy_id: options.newAgentPolicyId,
    },
    namespaces,
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'already assigned or assigned to hosted policy'
  );

  return { actionId };
}
