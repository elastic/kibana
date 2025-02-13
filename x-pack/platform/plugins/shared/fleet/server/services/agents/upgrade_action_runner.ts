/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

import {
  getRecentUpgradeInfoForAgent,
  getNotUpgradeableMessage,
  isAgentUpgradeableToVersion,
} from '../../../common/services';

import type { Agent } from '../../types';

import { HostedAgentPolicyRestrictionRelatedError, FleetError } from '../../errors';

import { appContextService } from '../app_context';

import { ActionRunner } from './action_runner';

import type { GetAgentsOptions } from './crud';
import { bulkUpdateAgents } from './crud';
import { createErrorActionResults, createAgentAction } from './actions';
import { getHostedPolicies, isHostedAgent } from './hosted_agent';
import { BulkActionTaskType } from './bulk_action_types';
import { getCancelledActions } from './action_status';
import { getLatestAvailableAgentVersion } from './versions';

export class UpgradeActionRunner extends ActionRunner {
  protected async processAgents(agents: Agent[]): Promise<{ actionId: string }> {
    return await upgradeBatch(
      this.esClient,
      agents,
      {},
      this.actionParams! as any,
      this.actionParams?.spaceId
    );
  }

  protected getTaskType() {
    return BulkActionTaskType.UPGRADE_RETRY;
  }

  protected getActionType() {
    return 'UPGRADE';
  }
}

const isActionIdCancelled = async (esClient: ElasticsearchClient, actionId: string) => {
  const cancelledActions = await getCancelledActions(esClient);
  return cancelledActions.filter((action) => action.actionId === actionId).length > 0;
};

export async function upgradeBatch(
  esClient: ElasticsearchClient,
  givenAgents: Agent[],
  outgoingErrors: Record<Agent['id'], Error>,
  options: ({ agents: Agent[] } | GetAgentsOptions) & {
    actionId?: string;
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    skipRateLimitCheck?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
    total?: number;
  },
  spaceId?: string
): Promise<{ actionId: string }> {
  const soClient = appContextService.getInternalUserSOClientForSpaceId(spaceId);
  const errors: Record<Agent['id'], Error> = { ...outgoingErrors };

  const hostedPolicies = await getHostedPolicies(soClient, givenAgents);

  // results from getAgents with options.kuery '' (or even 'active:false') may include hosted agents
  // filter them out unless options.force
  const agentsToCheckUpgradeable =
    'kuery' in options && !options.force
      ? givenAgents.filter((agent: Agent) => !isHostedAgent(hostedPolicies, agent))
      : givenAgents;

  const latestAgentVersion = await getLatestAvailableAgentVersion();
  const upgradeableResults = await Promise.allSettled(
    agentsToCheckUpgradeable.map(async (agent) => {
      // Filter out agents that are:
      //  - currently unenrolling
      //  - unenrolled
      //  - recently upgraded
      //  - currently upgrading
      //  - upgradeable b/c of version check
      const isNotAllowed =
        (!options.skipRateLimitCheck &&
          getRecentUpgradeInfoForAgent(agent).hasBeenUpgradedRecently) ||
        (!options.force &&
          !options.skipRateLimitCheck &&
          !isAgentUpgradeableToVersion(agent, options.version));
      if (isNotAllowed) {
        throw new FleetError(
          `Agent ${agent.id} is not upgradeable: ${getNotUpgradeableMessage(
            agent,
            latestAgentVersion,
            options.version
          )}`
        );
      }

      if (!options.force && isHostedAgent(hostedPolicies, agent)) {
        throw new HostedAgentPolicyRestrictionRelatedError(
          `Cannot upgrade agent in hosted agent policy ${agent.policy_id}`
        );
      }
      return agent;
    })
  );

  // Filter & record errors from results
  const agentsToUpdate = upgradeableResults.reduce<Agent[]>((agents, result, index) => {
    if (result.status === 'fulfilled') {
      agents.push(result.value);
    } else {
      const id = givenAgents[index].id;
      errors[id] = result.reason;
    }
    return agents;
  }, []);

  // Create upgrade action for each agent
  const now = new Date().toISOString();
  const data = {
    version: options.version,
    sourceURI: options.sourceUri,
  };

  const rollingUpgradeOptions = getRollingUpgradeOptions(
    options?.startTime,
    options.upgradeDurationSeconds
  );

  if (options.actionId && (await isActionIdCancelled(esClient, options.actionId))) {
    appContextService
      .getLogger()
      .info(
        `Skipping batch of actionId:${options.actionId} of ${givenAgents.length} agents as the upgrade was cancelled`
      );
    return {
      actionId: options.actionId,
    };
  }
  if (options.actionId) {
    appContextService
      .getLogger()
      .info(
        `Continuing batch of actionId:${options.actionId} of ${givenAgents.length} agents of upgrade`
      );
  }

  await bulkUpdateAgents(
    esClient,
    agentsToUpdate.map((agent) => ({
      agentId: agent.id,
      data: {
        upgraded_at: null,
        upgrade_started_at: now,
      },
    })),
    errors
  );

  const actionId = options.actionId ?? uuidv4();
  const total = options.total ?? givenAgents.length;
  const namespaces = spaceId ? [spaceId] : [];

  await createAgentAction(esClient, {
    id: actionId,
    created_at: now,
    data,
    ack_data: data,
    type: 'UPGRADE',
    total,
    agents: agentsToUpdate.map((agent) => agent.id),
    ...rollingUpgradeOptions,
    namespaces,
  });

  await createErrorActionResults(
    esClient,
    actionId,
    errors,
    'cannot upgrade hosted agent or agent not upgradeable'
  );

  return {
    actionId,
  };
}

export const MINIMUM_EXECUTION_DURATION_SECONDS = 60 * 60 * 2; // 2h
export const EXPIRATION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 1 month

export const getRollingUpgradeOptions = (startTime?: string, upgradeDurationSeconds?: number) => {
  const now = new Date().toISOString();
  // Perform a rolling upgrade
  if (upgradeDurationSeconds) {
    const minExecutionDuration = Math.min(
      MINIMUM_EXECUTION_DURATION_SECONDS,
      upgradeDurationSeconds
    );
    return {
      start_time: startTime ?? now,
      rollout_duration_seconds: upgradeDurationSeconds,
      minimum_execution_duration: minExecutionDuration,
      // expiration will not be taken into account with Fleet Server version >=8.7, it is kept for BWC
      // in the next major, expiration and minimum_execution_duration should be removed
      expiration: moment(startTime ?? now)
        .add(
          upgradeDurationSeconds <= MINIMUM_EXECUTION_DURATION_SECONDS
            ? minExecutionDuration * 2
            : upgradeDurationSeconds,
          'seconds'
        )
        .toISOString(),
    };
  }
  // Schedule without rolling upgrade (Immediately after start_time)
  // Expiration time is set to a very long value (1 month) to allow upgrading agents staying offline for long time
  if (startTime && !upgradeDurationSeconds) {
    return {
      start_time: startTime ?? now,
      minimum_execution_duration: MINIMUM_EXECUTION_DURATION_SECONDS,
      expiration: moment(startTime).add(EXPIRATION_DURATION_SECONDS, 'seconds').toISOString(),
    };
  } else {
    // Regular bulk upgrade (non scheduled, non rolling)
    return {};
  }
};
