/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

import { AgentReassignmentError, HostedAgentPolicyRestrictionRelatedError } from '../../errors';

import { appContextService } from '../app_context';

import { agentPolicyService } from '../agent_policy';

import { ActionRunner } from './action_runner';

import { bulkUpdateAgents } from './crud';
import { createErrorActionResults, createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_action_types';
import { checkAgentVersionCompatibilityForReassign } from './reassign';

export class ReassignActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await reassignBatch(
      this.esClient,
      {
        newAgentPolicyId: this.actionParams!.newAgentPolicyId,
        actionId: this.actionParams!.actionId,
        total: this.actionParams!.total,
        spaceId: this.actionParams!.spaceId,
        force: this.actionParams!.force,
      },
      agents,
      {}
    );
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
    force?: boolean;
  },
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>
): Promise<{ actionId: string }> {
  const spaceId = options.spaceId;
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  // Check version compatibility for all agents when force is not true
  let agentsToCheck = givenAgents;
  if (!options.force) {
    const compatibleAgents: Agent[] = [];
    for (const agent of givenAgents) {
      const versionError = await checkAgentVersionCompatibilityForReassign(
        soClient,
        agent,
        options.newAgentPolicyId
      );
      if (versionError) {
        errors[agent.id] = versionError;
      } else {
        compatibleAgents.push(agent);
      }
    }
    agentsToCheck = compatibleAgents;
  }

  const hostedPolicies = await getHostedPolicies(soClient, agentsToCheck);

  const agentsToUpdate = agentsToCheck.reduce<Agent[]>((agents, agent) => {
    if (agent.policy_id === options.newAgentPolicyId) {
      errors[agent.id] = new AgentReassignmentError(
        `Agent ${agent.id} is already assigned to agent policy ${options.newAgentPolicyId}`
      );
    } else if (isHostedAgent(hostedPolicies, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot reassign an agent from hosted agent policy ${agent.policy_id}`
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
    throw new AgentReassignmentError(
      'No agents to reassign: agents may be already assigned, assigned to a hosted policy, on an incompatible version, or not found'
    );
  }

  const newAgentPolicy = await agentPolicyService.get(soClient, options.newAgentPolicyId);

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        policy_id: options.newAgentPolicyId,
        policy_revision: null,
        ...(newAgentPolicy?.space_ids ? { namespaces: newAgentPolicy.space_ids } : {}),
      },
    })),
    errors
  );

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;
  const now = new Date().toISOString();
  const namespaces = spaceId ? [spaceId] : [];

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
    'already assigned, assigned to a hosted policy, on an incompatible version, or not found'
  );

  return { actionId };
}
