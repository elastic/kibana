/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import { SO_SEARCH_LIMIT } from '../../constants';
import {
  AgentNotFoundError,
  FleetError,
  HostedAgentPolicyRestrictionRelatedError,
} from '../../errors';

import { getCurrentNamespace } from '../spaces/get_current_namespace';
import { agentPolicyService } from '../agent_policy';
import {
  getAgentUninstallIneligibleReason,
  isUninstallDelayValid,
  UNINSTALL_DELAY_DEFAULT_SECONDS,
  UNINSTALL_DELAY_MAX_SECONDS,
  UNINSTALL_DELAY_MIN_SECONDS,
} from '../../../common/services';

import type { Agent } from '../../types';
import type { GetAgentsOptions } from '.';
import { getAgentById, getAgentsById, getAgentsByKuery, openPointInTime } from './crud';
import { createAgentAction, createErrorActionResults } from './actions';
import { throwIfAgentlessAgentPolicy } from './hosted_agent';
import {
  getUninstallIneligibleMessage,
  UninstallActionRunner,
  uninstallBatch,
} from './uninstall_action_runner';

// How long after start_time the action stays valid, so an uninstall that never ran is observable.
const UNINSTALL_EXPIRATION_AFTER_START_MS = 24 * 60 * 60 * 1000;

/** Computes the grace period (start_time) and expiration of an UNINSTALL action. */
export const getUninstallActionTiming = (
  delaySeconds: number = UNINSTALL_DELAY_DEFAULT_SECONDS,
  now: number = Date.now()
): { startTime: string; expiration: string } => {
  if (!isUninstallDelayValid(delaySeconds)) {
    throw new FleetError(
      `Invalid uninstall delay: must be a whole number of seconds between ${UNINSTALL_DELAY_MIN_SECONDS} and ${UNINSTALL_DELAY_MAX_SECONDS}.`
    );
  }
  const startTime = now + delaySeconds * 1000;
  return {
    startTime: new Date(startTime).toISOString(),
    expiration: new Date(startTime + UNINSTALL_EXPIRATION_AFTER_START_MS).toISOString(),
  };
};

export async function uninstallAgent(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  agentId: string,
  options: { delaySeconds?: number } = {}
): Promise<{ actionId: string }> {
  const { startTime, expiration } = getUninstallActionTiming(options.delaySeconds);
  const agent = await getAgentById(esClient, soClient, agentId);

  const ineligibleReason = getAgentUninstallIneligibleReason(agent);
  if (ineligibleReason) {
    throw new FleetError(getUninstallIneligibleMessage(agentId, ineligibleReason));
  }

  if (agent.policy_id) {
    const agentPolicy = await agentPolicyService.get(soClient, agent.policy_id, false);
    if (agentPolicy?.is_managed) {
      throw new HostedAgentPolicyRestrictionRelatedError(
        `Cannot uninstall agent ${agentId} in hosted agent policy ${agentPolicy.id}`
      );
    }
    throwIfAgentlessAgentPolicy(agentPolicy, `Cannot uninstall managed agent ${agentId}`);
  }

  const action = await createAgentAction(esClient, soClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'UNINSTALL',
    start_time: startTime,
    expiration,
    namespaces: [getCurrentNamespace(soClient)],
  });
  return { actionId: action.id };
}

export async function bulkUninstallAgents(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions & {
    delaySeconds?: number;
    batchSize?: number;
    includeInactive?: boolean;
  }
): Promise<{ actionId: string }> {
  const currentSpaceId = getCurrentNamespace(soClient);
  const timing = getUninstallActionTiming(options.delaySeconds);

  if ('agentIds' in options) {
    const uniqueAgentIds = [...new Set(options.agentIds)];
    const maybeAgents = await getAgentsById(esClient, soClient, uniqueAgentIds);
    const missingErrors: Record<Agent['id'], Error> = {};
    const givenAgents: Agent[] = [];
    for (const maybeAgent of maybeAgents) {
      if ('notFound' in maybeAgent) {
        missingErrors[maybeAgent.id] = new AgentNotFoundError(`Agent ${maybeAgent.id} not found`);
      } else {
        givenAgents.push(maybeAgent);
      }
    }
    const result = await uninstallBatch(esClient, soClient, givenAgents, {
      ...timing,
      spaceId: currentSpaceId,
      total: uniqueAgentIds.length,
    });
    await createErrorActionResults(esClient, result.actionId, missingErrors, 'agent not found');
    return result;
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
  const showInactive = options.includeInactive ?? false;

  const { total } = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    spaceId: currentSpaceId,
    showInactive,
    page: 1,
    perPage: 0,
  });

  if (total <= batchSize) {
    const { agents } = await getAgentsByKuery(esClient, soClient, {
      kuery: options.kuery,
      spaceId: currentSpaceId,
      showInactive,
      page: 1,
      perPage: batchSize,
    });
    return await uninstallBatch(esClient, soClient, agents, { ...timing, spaceId: currentSpaceId });
  }

  const runner = new UninstallActionRunner(
    esClient,
    soClient,
    {
      ...options,
      ...timing,
      batchSize,
      total,
      spaceId: currentSpaceId,
      showInactive,
    },
    { pitId: await openPointInTime(esClient) }
  );
  return await runner.runActionAsyncTask();
}
