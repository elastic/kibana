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

export interface OsqueryResultRow {
  [key: string]: string | number | boolean | undefined;
}

export interface IndexedResultRowDoc {
  docId: string;
  agentId: string;
}

export interface IndexedResultRowsResult {
  data: { docs: IndexedResultRowDoc[]; index: string };
  cleanup: () => Promise<void>;
}

export interface IndexResultRowsOptions {
  actionId: string;
  agents: GeneratedAgent[];
  /** osquery.* fields for each row (e.g. `{ name: 'Darwin', version: '14.5' }`) */
  rows?: OsqueryResultRow[];
  /** ECS-mapped fields (merged at root level, e.g. `{ message: 'days_value', tags: 'scout' }`) */
  ecsFields?: Record<string, string>;
}

/**
 * Writes per-agent result rows to `logs-osquery_manager.result-default`.
 *
 * Required fields (`action_id`, `agent.id`, `agent.name`, `elastic_agent.id`,
 * `host.name`, `osquery.*`) mirror what `buildResultsQuery` selects
 * (`fields: ['elastic_agent.*', 'agent.*', 'osquery.*']`).
 *
 * Optional ECS-mapped fields are merged at root level so the UI's ECS column
 * headers appear in the results grid.
 */
export async function indexResultRows(
  esClient: Client,
  { actionId, agents, rows = [{}], ecsFields = {} }: IndexResultRowsOptions
): Promise<IndexedResultRowsResult> {
  const now = new Date().toISOString();
  const docs: IndexedResultRowDoc[] = [];

  const operations = agents.flatMap((agent) =>
    rows.flatMap((row) => {
      const docId = uuidV4();
      docs.push({ docId, agentId: agent.agentId });

      return [
        { create: { _index: RESULT_ROWS_INDEX, _id: docId } },
        {
          action_id: actionId,
          '@timestamp': now,
          'event.ingested': now,
          'agent.id': agent.agentId,
          'agent.name': agent.hostName,
          'elastic_agent.id': agent.elasticAgentId,
          'host.name': agent.hostName,
          osquery: row,
          ...ecsFields,
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
