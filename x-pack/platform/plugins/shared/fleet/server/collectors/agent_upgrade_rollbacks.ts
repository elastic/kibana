/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENT_ACTIONS_INDEX, SO_SEARCH_LIMIT } from '../../common';

export interface AgentUpgradeRollbacksData {
  agent_upgrade_rollbacks: number;
}

const DEFAULT_DATA: AgentUpgradeRollbacksData = {
  agent_upgrade_rollbacks: 0,
};

interface ActionDoc {
  data?: {
    rollback?: boolean;
  };
}

export async function getAgentUpgradeRollbacks(
  esClient?: ElasticsearchClient
): Promise<AgentUpgradeRollbacksData> {
  if (!esClient) {
    return DEFAULT_DATA;
  }

  const res = await esClient.search<ActionDoc>(
    {
      index: AGENT_ACTIONS_INDEX,
      size: SO_SEARCH_LIMIT,
      _source: ['data.rollback'],
      query: {
        bool: {
          filter: [
            { term: { type: 'UPGRADE' } },
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
    },
    { ignore: [404] }
  );

  const count = res?.hits?.hits.filter((hit) => hit._source?.data?.rollback === true).length ?? 0;

  return {
    agent_upgrade_rollbacks: count,
  };
}
