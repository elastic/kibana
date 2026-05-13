/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { v4 as uuidV4 } from 'uuid';
import type { GeneratedAgent } from './osquery_data_generator';

/** Data-stream form (no leading dot) — matches `ACTION_RESPONSES_DATA_STREAM_INDEX`. */
const ACTION_RESPONSES_INDEX = 'logs-osquery_manager.action.responses-default';

export interface IndexedActionResponseDoc {
  docId: string;
  agentId: string;
}

export interface IndexedActionResponsesResult {
  data: { docs: IndexedActionResponseDoc[]; index: string };
  cleanup: () => Promise<void>;
}

export interface IndexActionResponsesOptions {
  actionId: string;
  agents: GeneratedAgent[];
  rowCountPerAgent?: number;
}

/**
 * Writes per-agent status docs to `logs-osquery_manager.action.responses-default`.
 *
 * `action_response.osquery.count` is the field aggregated by
 * `query.action_results.dsl.ts` (`rows_count` sum agg) — must be set to reflect
 * how many result rows were seeded for this agent.
 *
 * Shape mirrors the mock response factory in
 * `server/routes/action_results/mocks.ts`.
 */
export async function indexActionResponses(
  esClient: Client,
  { actionId, agents, rowCountPerAgent = 1 }: IndexActionResponsesOptions
): Promise<IndexedActionResponsesResult> {
  const now = new Date().toISOString();
  const docs: IndexedActionResponseDoc[] = [];

  const operations = agents.flatMap((agent) => {
    const docId = uuidV4();
    docs.push({ docId, agentId: agent.agentId });

    return [
      { create: { _index: ACTION_RESPONSES_INDEX, _id: docId } },
      {
        action_id: actionId,
        agent_id: agent.agentId,
        'agent.id': agent.agentId,
        '@timestamp': now,
        'event.ingested': now,
        action_response: {
          osquery: { count: rowCountPerAgent },
        },
      },
    ];
  });

  await esClient.bulk({ operations, refresh: 'wait_for' });

  return {
    data: { docs, index: ACTION_RESPONSES_INDEX },
    cleanup: async () => {
      await esClient.bulk({
        operations: docs.map((d) => ({
          delete: { _index: ACTION_RESPONSES_INDEX, _id: d.docId },
        })),
        refresh: 'wait_for',
      });
    },
  };
}
