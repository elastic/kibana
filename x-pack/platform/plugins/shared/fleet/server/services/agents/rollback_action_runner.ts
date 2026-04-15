/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';

import { appContextService } from '../app_context';
import type { Agent } from '../../types';
import { HostedAgentPolicyRestrictionRelatedError } from '../../errors';
import { AgentRollbackError } from '../../errors';

import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { createErrorActionResults, createAgentAction } from './actions';
import { bulkUpdateAgents } from './crud';
import {
  EXPIRED_ROLLBACK_ERROR_MESSAGE,
  getValidRollbacks,
  NO_ROLLBACK_ERROR_MESSAGE,
} from './rollback';

export class RollbackActionRunner extends ActionRunner {
  private allActionIds: string[] = [];

  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    const result = await rollbackBatch(
      this.esClient,
      agents,
      {},
      {
        // Don't pass actionId - each version group should get its own unique ID
        // actionId is for tracking the bulk operation task, not individual rollback actions
        // Don't pass total - each action should use the count for its version group, not the total across all batches
        spaceIds: this.actionParams?.spaceId ? [this.actionParams.spaceId] : undefined,
      },
      this.actionParams?.spaceId ? [this.actionParams.spaceId] : undefined
    );
    // Track all action IDs created across batches
    this.allActionIds.push(...result.actionIds);
    // Return the first actionId for compatibility with ActionRunner interface
    // If no actions were created, return empty string
    return {
      actionId: result.actionIds.length > 0 ? result.actionIds[0] : '',
    };
  }

  async processAgentsInBatches(): Promise<{ actionId: string }> {
    // Reset action IDs tracking for this batch processing run
    this.allActionIds = [];
    const result = await super.processAgentsInBatches();
    // Store all collected action IDs in actionParams for retrieval
    if (this.allActionIds.length > 0) {
      this.actionParams.allActionIds = this.allActionIds;
    }
    return result;
  }

  public getAllActionIds(): string[] {
    return this.allActionIds;
  }

  protected getTaskType() {
    return BulkActionTaskType.ROLLBACK_RETRY;
  }

  protected getActionType() {
    return 'UPGRADE';
  }
}

export async function rollbackBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: {
    actionId?: string;
    total?: number;
    spaceIds?: string[];
  },
  spaceIds?: string[]
): Promise<{ actionIds: string[] }> {
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceIds?.[0]);

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  // Eligible agents, grouped by rollback version
  const agentsByRollbackVersion: Record<string, Agent[]> = {};

  // Pre-action errors are not linked to a specific rollback version:
  // - agent not found
  // - agent exists but has no available rollback
  const preActionErrors: Record<Agent['id'], Error> = { ...outgoingErrors };
  // Version-specific errors are linked to a specific rollback version:
  // - expired rollback
  // - hosted agent
  const errorsByRollbackVersion: Record<string, Record<Agent['id'], Error>> = {};

  for (const agent of givenAgents) {
    const rollbacks = agent.upgrade?.rollbacks || [];

    // If agent has no available rollbacks, add to pre-action errors
    if (rollbacks.length === 0) {
      preActionErrors[agent.id] = new AgentRollbackError(NO_ROLLBACK_ERROR_MESSAGE);
      continue;
    }

    const rollbackVersion = rollbacks[0].version;

    // If agent has expired rollback, add to version-specific errors
    const validRollbacks = getValidRollbacks(agent);
    if (validRollbacks.length === 0) {
      if (!errorsByRollbackVersion[rollbackVersion]) {
        errorsByRollbackVersion[rollbackVersion] = {};
      }
      errorsByRollbackVersion[rollbackVersion][agent.id] = new AgentRollbackError(
        EXPIRED_ROLLBACK_ERROR_MESSAGE
      );
      continue;
    }

    // If agent is hosted, add to version-specific errors
    if (isHostedAgent(hostedPolicies, agent)) {
      if (!errorsByRollbackVersion[rollbackVersion]) {
        errorsByRollbackVersion[rollbackVersion] = {};
      }
      errorsByRollbackVersion[rollbackVersion][agent.id] =
        new HostedAgentPolicyRestrictionRelatedError(
          `Cannot rollback agent in hosted agent policy ${agent.policy_id}`
        );
      continue;
    }

    // Agent is eligible for upgrade rollback
    if (!agentsByRollbackVersion[rollbackVersion]) {
      agentsByRollbackVersion[rollbackVersion] = [];
    }
    agentsByRollbackVersion[rollbackVersion].push(agent);
  }

  // Create upgrade actions with rollback:true for each version group with agents
  const actionIds: string[] = [];

  const errorsByActionId: Record<string, Record<Agent['id'], Error>> = {};

  const now = new Date().toISOString();
  const namespaces = spaceIds ?? options.spaceIds ?? [];

  for (const [version, agents] of Object.entries(agentsByRollbackVersion)) {
    const actionId = options.actionId ?? uuidv4();
    const total = options.total ?? agents.length;
    const data = {
      version,
      rollback: true,
    };

    await createAgentAction(esClient, soClient, {
      id: actionId,
      created_at: now,
      data,
      ack_data: data,
      type: 'UPGRADE',
      total,
      agents: agents.map((agent) => agent.id),
      namespaces,
    });

    actionIds.push(actionId);
    errorsByActionId[actionId] = {};

    // Assign version-specific errors (expired rollbacks, hosted agents) to this action
    if (errorsByRollbackVersion[version]) {
      Object.assign(errorsByActionId[actionId], errorsByRollbackVersion[version]);
    }

    await bulkUpdateAgents(
      esClient,
      agents.map((agent) => ({
        agentId: agent.id,
        data: {
          upgraded_at: null,
          upgrade_started_at: now,
        },
      })),
      errorsByActionId[actionId]
    );
  }

  // Create actions for versions that have errors but no eligible agents
  for (const [version, versionErrors] of Object.entries(errorsByRollbackVersion)) {
    // Skip if we already created an action for this version
    if (agentsByRollbackVersion[version]) {
      continue;
    }

    // Create error-only action for this version
    const actionId = uuidv4();
    const total = Object.keys(versionErrors).length;

    await createAgentAction(esClient, soClient, {
      id: actionId,
      created_at: now,
      data: {
        version,
        rollback: true,
      },
      ack_data: {
        version,
        rollback: true,
      },
      type: 'UPGRADE',
      total,
      agents: [],
      namespaces,
    });

    actionIds.push(actionId);
    errorsByActionId[actionId] = { ...versionErrors };
  }

  // Create error action results

  // Pre-action errors cannot be associated with a specific rollback version. These errors
  // are assigned to the first action, or to an error-only action if no valid actions were created.
  if (Object.keys(preActionErrors).length > 0) {
    if (actionIds.length > 0) {
      if (!errorsByActionId[actionIds[0]]) {
        errorsByActionId[actionIds[0]] = {};
      }
      Object.assign(errorsByActionId[actionIds[0]], preActionErrors);
    } else {
      const errorOnlyActionId = uuidv4();
      await createAgentAction(esClient, soClient, {
        id: errorOnlyActionId,
        created_at: now,
        data: {
          rollback: true,
        },
        ack_data: {
          rollback: true,
        },
        type: 'UPGRADE',
        total: Object.keys(preActionErrors).length,
        agents: [],
        namespaces,
      });
      actionIds.push(errorOnlyActionId);
      errorsByActionId[errorOnlyActionId] = preActionErrors;
    }
  }

  // Errors for agents with rollback data are assigned to their version-specific action.
  for (const actionId of actionIds) {
    const actionErrors = errorsByActionId[actionId];
    if (actionErrors && Object.keys(actionErrors).length > 0) {
      await createErrorActionResults(
        esClient,
        actionId,
        actionErrors,
        'no valid rollback available for agent'
      );
    }
  }

  return {
    actionIds,
  };
}
