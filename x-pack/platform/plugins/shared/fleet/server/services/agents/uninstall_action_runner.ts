/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { Agent } from '../../types';
import {
  AgentlessAgentRestrictionError,
  FleetError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';
import { appContextService } from '../app_context';
import { getAgentUninstallIneligibleReason } from '../../../common/services';
import type { AgentUninstallIneligibleReason } from '../../../common/services';

import { ActionRunner } from './action_runner';
import { createAgentAction, createErrorActionResults } from './actions';
import { BulkActionTaskType } from './bulk_action_types';
import { getAgentPolicyRestrictions, isAgentlessAgent, isHostedAgent } from './hosted_agent';

const INELIGIBLE_REASON_MESSAGES: Record<AgentUninstallIneligibleReason, string> = {
  not_supported: 'does not support the uninstall action',
  unprivileged: 'is unprivileged and cannot be uninstalled remotely',
  not_unenrolled: 'must be unenrolled before it can be uninstalled',
};

export const getUninstallIneligibleMessage = (
  agentId: string,
  reason: AgentUninstallIneligibleReason
): string => `Agent ${agentId} ${INELIGIBLE_REASON_MESSAGES[reason]}.`;

export class UninstallActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await uninstallBatch(this.esClient, this.soClient, agents, {
      ...this.actionParams,
      startTime: this.actionParams.startTime,
      expiration: this.actionParams.expiration,
    });
  }

  protected getTaskType() {
    return BulkActionTaskType.UNINSTALL_RETRY;
  }

  protected getActionType() {
    return 'UNINSTALL';
  }
}

export async function uninstallBatch(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  givenAgents: Agent[],
  options: {
    startTime: string;
    expiration: string;
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

  const restrictions = await getAgentPolicyRestrictions(internalSoClient, givenAgents);

  const errors: Record<Agent['id'], Error> = {};
  const eligibleAgents: Agent[] = [];

  for (const agent of givenAgents) {
    const ineligibleReason = getAgentUninstallIneligibleReason(agent);
    if (isHostedAgent(restrictions, agent)) {
      errors[agent.id] = new HostedAgentPolicyRestrictionRelatedError(
        `Cannot uninstall agent in hosted agent policy ${agent.policy_id}`
      );
    } else if (isAgentlessAgent(restrictions, agent)) {
      errors[agent.id] = new AgentlessAgentRestrictionError(
        `Cannot uninstall managed agent ${agent.id}`
      );
    } else if (ineligibleReason) {
      errors[agent.id] = new FleetError(getUninstallIneligibleMessage(agent.id, ineligibleReason));
    } else {
      eligibleAgents.push(agent);
    }
  }

  await createAgentAction(esClient, internalSoClient, {
    id: actionId,
    agents: eligibleAgents.map((agent) => agent.id),
    created_at: now,
    type: 'UNINSTALL',
    start_time: options.startTime,
    expiration: options.expiration,
    total,
    namespaces,
  });

  await createErrorActionResults(esClient, actionId, errors, 'uninstall not supported');

  return { actionId };
}
