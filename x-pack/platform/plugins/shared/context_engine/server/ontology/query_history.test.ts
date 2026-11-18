/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findTraceRounds, loadTraceRounds } from '../dreaming/trace_rounds';
import {
  connectorCallsOfMessages,
  esqlQueriesOfMessages,
  readOntologyQueryHistory,
  type QueryHistoryTarget,
} from './query_history';

jest.mock('../dreaming/trace_rounds', () => ({
  findTraceRounds: jest.fn(),
  loadTraceRounds: jest.fn(),
}));

const toolCall = (name: string, args: unknown) => ({
  role: 'assistant',
  parts: [
    { type: 'tool_call', name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
  ],
});

const trace = { type: 'elastic_agent' as const, value: 'agent', query: 'FROM traces-*' };
const window = { since: '2026-11-16T00:00:00.000Z', until: '2026-11-18T00:00:00.000Z', size: 50 };

describe('esqlQueriesOfMessages', () => {
  it('finds ES|QL queries anywhere in tool call arguments', () => {
    const messages = JSON.stringify([
      { role: 'user', parts: [{ type: 'text', content: 'FROM orders is not a tool call' }] },
      toolCall('platform.core.execute_esql', { query: 'FROM orders | LIMIT 5' }),
      toolCall('search', { nested: { esql: '  from logs-* | STATS c = COUNT(*)' }, other: 'text' }),
      toolCall('broken', '{not json'),
    ]);

    expect(esqlQueriesOfMessages(messages)).toEqual([
      'FROM orders | LIMIT 5',
      '  from logs-* | STATS c = COUNT(*)',
    ]);
  });
});

describe('connectorCallsOfMessages', () => {
  it("keeps the sub-action calls agents made on the connector, by the tool's id or model-safe name", () => {
    const messages = JSON.stringify([
      toolCall('platform.core.execute_connector_sub_action', {
        connectorId: 'drive-1',
        subAction: 'searchFiles',
        params: { query: 'budget' },
      }),
      toolCall('platform_core_execute_connector_sub_action', {
        connectorId: 'drive-1',
        subAction: 'listFolders',
      }),
      toolCall('platform.core.execute_connector_sub_action', {
        connectorId: 'other',
        subAction: 'searchFiles',
      }),
      toolCall('search', { connectorId: 'drive-1', subAction: 'x' }),
    ]);

    expect(connectorCallsOfMessages('drive-1', messages)).toEqual([
      '{"subAction":"searchFiles","params":{"query":"budget"}}',
      '{"subAction":"listFolders","params":{}}',
    ]);
  });
});

describe('readOntologyQueryHistory', () => {
  const esClient = {} as ElasticsearchClient;
  const read = (target: QueryHistoryTarget) =>
    readOntologyQueryHistory({ esClient, traces: [trace], target, ...window });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(findTraceRounds).mockResolvedValue([
      { traceId: 't1', lastAt: '2026-11-17T10:00:00.000Z', target: 'traces-*' },
      { traceId: 't2', lastAt: '2026-11-17T11:00:00.000Z', target: 'traces-*' },
    ]);
    jest.mocked(loadTraceRounds).mockResolvedValue(
      new Map([
        [
          't1',
          {
            inputMessages: JSON.stringify([
              toolCall('esql', { query: 'FROM orders | WHERE status == "paid"' }),
              toolCall('platform.core.execute_connector_sub_action', {
                connectorId: 'drive-1',
                subAction: 'searchFiles',
                params: {},
              }),
            ]),
          },
        ],
        [
          't2',
          {
            outputMessages: JSON.stringify([
              toolCall('esql', { query: 'FROM orders   | WHERE status == "paid"' }),
              toolCall('esql', { query: 'FROM logs-app-* | LIMIT 1' }),
              toolCall('esql', { query: 'FROM customers | LIMIT 1' }),
            ]),
          },
        ],
      ])
    );
  });

  it('keeps the queries whose FROM names a dataset, newest first and deduplicated', async () => {
    await expect(read({ kind: 'esql', datasets: ['orders', 'logs-app-default'] })).resolves.toEqual(
      {
        queries: [
          {
            dataset: 'orders',
            query: 'FROM orders | WHERE status == "paid"',
            round_id: 'trace:t2',
          },
          { dataset: 'logs-app-default', query: 'FROM logs-app-* | LIMIT 1', round_id: 'trace:t2' },
        ],
        rounds: 2,
        sources: [{ type: 'elastic_agent', value: 'agent', rounds: 2 }],
      }
    );
  });

  it("keeps a connector source's calls under its dataset", async () => {
    const { queries } = await read({
      kind: 'connector',
      connectorId: 'drive-1',
      dataset: 'connector:drive-1',
    });

    expect(queries).toEqual([
      {
        dataset: 'connector:drive-1',
        query: '{"subAction":"searchFiles","params":{}}',
        round_id: 'trace:t1',
      },
    ]);
  });

  it('reads nothing without datasets, and reports a source that fails', async () => {
    const none = await read({ kind: 'esql', datasets: [] });
    expect(none.queries).toEqual([]);
    expect(findTraceRounds).not.toHaveBeenCalled();

    jest.mocked(findTraceRounds).mockRejectedValueOnce(new Error('no access'));
    const failed = await read({ kind: 'esql', datasets: ['orders'] });
    expect(failed.sources).toEqual([
      { type: 'elastic_agent', value: 'agent', rounds: 0, error: 'no access' },
    ]);
  });
});
