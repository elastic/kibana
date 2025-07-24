/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { CoreSetup } from '@kbn/core/server';

import { AGENTS_INDEX } from '../../../common';

import type { AgentPerVersion, AgentUsage } from '../../collectors/agent_collectors';
import { getAgentUsage } from '../../collectors/agent_collectors';
import { getInternalClients } from '../../collectors/helpers';
import { appContextService } from '../app_context';
import { retryTransientEsErrors } from '../epm/elasticsearch/retry';

export interface AgentMetrics {
  agents: AgentUsage;
  agents_per_version: AgentPerVersion[];
  upgrading_step: UpgradingSteps;
  unhealthy_reason: UnhealthyReason;
}

export interface UpgradingSteps {
  requested: number;
  scheduled: number;
  downloading: number;
  extracting: number;
  replacing: number;
  restarting: number;
  watching: number;
  rollback: number;
  failed: number;
}

export interface UnhealthyReason {
  input: number;
  output: number;
  other: number;
}

export const fetchAgentMetrics = async (
  core: CoreSetup,
  abortController: AbortController
): Promise<AgentMetrics | undefined> => {
  const [soClient, esClient] = await getInternalClients(core);
  if (!soClient || !esClient) {
    return;
  }

  const fleetAgentsIndexExists = await esClient.indices.exists({
    index: AGENTS_INDEX,
  });

  if (!fleetAgentsIndexExists) {
    return;
  }

  const usage = {
    agents: await getAgentUsage(soClient, esClient),
    agents_per_version: await getAgentsPerVersion(esClient, abortController),
    upgrading_step: await getUpgradingSteps(esClient, abortController),
    unhealthy_reason: await getUnhealthyReason(esClient, abortController),
  };

  return usage;
};

export const getAgentsPerVersion = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<AgentPerVersion[]> => {
  try {
    const esqlQuery = `FROM ${AGENTS_INDEX}
  | WHERE active: "true"
  | STATS COUNT(*) BY "agent.version"`;

    const response = await retryTransientEsErrors(() =>
      esClient.esql.query(
        {
          query: esqlQuery,
        },
        { signal: abortController.signal }
      )
    );
    return response.values.map((value: any) => {
      const version = value[1] as string;
      const count = value[0] as number;
      return {
        version,
        count,
      };
    });
  } catch (error) {
    if (error.statusCode === 400 && error.message.includes('Unknown index')) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return [];
  }
};

export const getUpgradingSteps = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<UpgradingSteps> => {
  const upgradingSteps = {
    requested: 0,
    scheduled: 0,
    downloading: 0,
    extracting: 0,
    replacing: 0,
    restarting: 0,
    watching: 0,
    rollback: 0,
    failed: 0,
  };
  try {
    const esqlQuery = `FROM ${AGENTS_INDEX}
  | WHERE active: "true" AND "upgrade_details.state" IS NOT NULL
  | STATS COUNT(*) BY "upgrade_details.state"`;

    const response = await retryTransientEsErrors(() =>
      esClient.esql.query(
        {
          query: esqlQuery,
        },
        { signal: abortController.signal }
      )
    );
    response.values.forEach((value: any) => {
      const state = value[1] as string;
      const count = value[0] as number;
      switch (state) {
        case 'UPG_REQUESTED':
          upgradingSteps.requested = count;
          break;
        case 'UPG_SCHEDULED':
          upgradingSteps.scheduled = count;
          break;
        case 'UPG_DOWNLOADING':
          upgradingSteps.downloading = count;
          break;
        case 'UPG_EXTRACTING':
          upgradingSteps.extracting = count;
          break;
        case 'UPG_REPLACING':
          upgradingSteps.replacing = count;
          break;
        case 'UPG_RESTARTING':
          upgradingSteps.restarting = count;
          break;
        case 'UPG_WATCHING':
          upgradingSteps.watching = count;
          break;
        case 'UPG_ROLLBACK':
          upgradingSteps.rollback = count;
          break;
        case 'UPG_FAILED':
          upgradingSteps.failed = count;
          break;
        default:
          break;
      }
    });
    return upgradingSteps;
  } catch (error) {
    if (error.statusCode === 400 && error.message.includes('Unknown index')) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return upgradingSteps;
  }
};

export const getUnhealthyReason = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<UnhealthyReason> => {
  const unhealthyReason = {
    input: 0,
    output: 0,
    other: 0,
  };
  try {
    const esqlQuery = `FROM ${AGENTS_INDEX}
  | WHERE "unhealthy_reason" IS NOT NULL
  | STATS COUNT(*) BY "unhealthy_reason"`;
    const response = await retryTransientEsErrors(() =>
      esClient.esql.query(
        {
          query: esqlQuery,
        },
        { signal: abortController.signal }
      )
    );
    response.values.forEach((value: any) => {
      const reason = value[1] as string;
      const count = value[0] as number;
      switch (reason) {
        case 'input':
          unhealthyReason.input = count;
          break;
        case 'output':
          unhealthyReason.output = count;
          break;
        case 'other':
          unhealthyReason.other = count;
          break;
        default:
          break;
      }
    });
    return unhealthyReason;
  } catch (error) {
    if (error.statusCode === 400 && error.message.includes('Unknown index')) {
      appContextService.getLogger().debug('Index .fleet-agents does not exist yet.');
    } else {
      throw error;
    }
    return unhealthyReason;
  }
};
