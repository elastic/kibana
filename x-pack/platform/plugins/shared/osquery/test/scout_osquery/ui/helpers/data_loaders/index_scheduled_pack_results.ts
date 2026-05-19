/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { v4 as uuidV4 } from 'uuid';
import type { GeneratedAgent } from './osquery_data_generator';

const RESULT_ROWS_INDEX = 'logs-osquery_manager.result-default';

export interface IndexedScheduledPackDoc {
  docId: string;
  agentId: string;
}

export interface IndexedScheduledPackResult {
  data: { docs: IndexedScheduledPackDoc[]; index: string };
  cleanup: () => Promise<void>;
}

export interface IndexScheduledPackResultsOptions {
  scheduleId: string;
  executionCount: number;
  agents: GeneratedAgent[];
  rows?: Record<string, string | number | boolean | undefined>[];
}

/**
 * Writes scheduled pack execution rows to `logs-osquery_manager.result-default`.
 *
 * `schedule_id` and `osquery_meta.schedule_execution_count` are consumed by
 * `buildResultsQuery` when constructing the scheduled-execution filter:
 *   `schedule_id: ${scheduleId} AND osquery_meta.schedule_execution_count: ${executionCount}`
 */
export async function indexScheduledPackResults(
  esClient: Client,
  { scheduleId, executionCount, agents, rows = [{}] }: IndexScheduledPackResultsOptions
): Promise<IndexedScheduledPackResult> {
  const now = new Date().toISOString();
  const docs: IndexedScheduledPackDoc[] = [];

  const operations = agents.flatMap((agent) =>
    rows.flatMap((row) => {
      const docId = uuidV4();
      docs.push({ docId, agentId: agent.agentId });

      return [
        { create: { _index: RESULT_ROWS_INDEX, _id: docId } },
        {
          schedule_id: scheduleId,
          osquery_meta: { schedule_execution_count: executionCount },
          '@timestamp': now,
          'event.ingested': now,
          'agent.id': agent.agentId,
          'agent.name': agent.hostName,
          'elastic_agent.id': agent.elasticAgentId,
          'host.name': agent.hostName,
          osquery: row,
        },
      ];
    })
  );

  await esClient.bulk({ operations, refresh: 'wait_for' });

  return {
    data: { docs, index: RESULT_ROWS_INDEX },
    cleanup: async () => {
      await esClient.bulk({
        operations: docs.map((d) => ({
          delete: { _index: RESULT_ROWS_INDEX, _id: d.docId },
        })),
        refresh: 'wait_for',
      });
    },
  };
}
