/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { sortBy } from 'lodash';

import { DATA_TIERS } from '../../common/constants';

import { appContextService } from '../services';

export interface AgentLogsData {
  agent_logs_top_errors: string[];
  fleet_server_logs_top_errors: string[];
}

const DEFAULT_LOGS_DATA = {
  agent_logs_top_errors: [],
  fleet_server_logs_top_errors: [],
};

export async function getAgentLogsTopErrors(
  esClient?: ElasticsearchClient
): Promise<AgentLogsData> {
  if (!esClient) {
    return DEFAULT_LOGS_DATA;
  }
  try {
    const queryTopMessages = (index: string) =>
      esClient.search({
        index,
        size: 100,
        _source: ['message'],
        query: {
          bool: {
            filter: [
              {
                terms: {
                  _tier: DATA_TIERS,
                },
              },
              {
                term: {
                  'log.level': 'error',
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-1h',
                  },
                },
              },
            ],
          },
        },
      });

    const getTopErrors = (resp: any) => {
      const counts = (resp?.hits.hits ?? []).reduce((acc: any, curr: any) => {
        if (!acc[curr._source.message]) {
          acc[curr._source.message] = 0;
        }
        acc[curr._source.message]++;
        return acc;
      }, {});
      const top3 = sortBy(
        Object.entries(counts).map(([key, value]) => ({ key, value })),
        'value'
      )
        .slice(0, 3)
        .reverse();
      return top3.map(({ key, value }) => key);
    };

    const agentResponse = await queryTopMessages('logs-elastic_agent-*');

    const fleetServerResponse = await queryTopMessages('logs-elastic_agent.fleet_server-*');

    return {
      agent_logs_top_errors: getTopErrors(agentResponse),
      fleet_server_logs_top_errors: getTopErrors(fleetServerResponse),
    };
  } catch (error) {
    if (error.statusCode === 404) {
      appContextService.getLogger().debug('Index pattern logs-elastic_agent* does not exist yet.');
    } else {
      throw error;
    }
    return DEFAULT_LOGS_DATA;
  }
}
