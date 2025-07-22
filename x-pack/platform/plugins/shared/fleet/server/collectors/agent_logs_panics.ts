/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

const AGENT_LOGS_INDEX_PATTERN = 'logs-elastic_agent-*';
const MAX_MESSAGE_COUNT = 100;

export interface AgentPanicLogsData {
  agent_logs_panics_last_hour: Array<{ message: string; timestamp: string }>;
}

const DEFAULT_LOGS_DATA = {
  agent_logs_panics_last_hour: [],
};

export async function getPanicLogsLastHour(
  esClient?: ElasticsearchClient
): Promise<AgentPanicLogsData> {
  if (!esClient) {
    return DEFAULT_LOGS_DATA;
  }

  try {
    const esqlQuery = `FROM ${AGENT_LOGS_INDEX_PATTERN} 
   | KEEP message, @timestamp
  | WHERE MATCH(message, \"panic\") AND @timestamp >= NOW() - 1 hour
  | SORT @timestamp DESC
  | LIMIT ${MAX_MESSAGE_COUNT}`;

    const res = await esClient.esql.query({
      query: esqlQuery,
    });

    const panicLogsLastHour = res.values.map((value) => ({
      message: (value[0] as string) || '',
      timestamp: (value[1] as string) || '',
    }));

    return {
      agent_logs_panics_last_hour: panicLogsLastHour,
    };
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('Unknown index')) {
      return DEFAULT_LOGS_DATA;
    } else {
      throw err;
    }
  }
}
