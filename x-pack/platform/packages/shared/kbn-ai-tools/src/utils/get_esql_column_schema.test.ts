/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getEsqlColumnSchema } from './get_esql_column_schema';

const signal = new AbortController().signal;

const createEsClient = () => {
  const query = jest.fn();
  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

describe('getEsqlColumnSchema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries a single index with LIMIT 0', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, signal, index: 'logs-*' });

    expect(query).toHaveBeenCalledWith({ query: 'FROM logs-* | LIMIT 0' }, { signal });
  });

  it('never passes drop_null_columns: true (regression: ES prunes every column when LIMIT 0)', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, signal, index: 'logs-*', start: 100, end: 200 });

    expect(query.mock.calls[0][0]).not.toHaveProperty('drop_null_columns');
  });

  it('queries multiple indices', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, signal, index: ['logs-a', 'logs-b'] });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-a, logs-b | LIMIT 0');
  });

  it('inlines the time range only when both bounds are provided', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValue({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, signal, index: 'logs-*', start: 100, end: 200 });
    await getEsqlColumnSchema({ esClient, signal, index: 'logs-*', start: 100 });

    expect(query.mock.calls[0][0]).toEqual({
      query:
        'FROM logs-* | WHERE @timestamp >= "1970-01-01T00:00:00.100Z" AND @timestamp <= "1970-01-01T00:00:00.200Z" | LIMIT 0',
    });
    expect(query.mock.calls[1][0]).toEqual({ query: 'FROM logs-* | LIMIT 0' });
  });

  it('parses column names, types, and original conflict types', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'message', type: 'text' },
        { name: 'host.name', type: 'unsupported', original_types: ['ip', 'keyword'] },
      ],
      values: [],
    });

    const schema = await getEsqlColumnSchema({ esClient, signal, index: 'logs-*' });

    expect(schema).toEqual([
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'text' },
      { name: 'host.name', type: 'unsupported', originalTypes: ['ip', 'keyword'] },
    ]);
  });

  it('parses the suggested cast for conflicting fields', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [
        {
          name: 'host.name',
          type: 'unsupported',
          original_types: ['ip', 'keyword'],
          suggested_cast: 'keyword',
        },
      ],
      values: [],
    });

    const schema = await getEsqlColumnSchema({ esClient, signal, index: 'logs-*' });

    expect(schema).toEqual([
      {
        name: 'host.name',
        type: 'unsupported',
        originalTypes: ['ip', 'keyword'],
        suggestedCast: 'keyword',
      },
    ]);
  });

  it('probes only the requested columns and leaves out the unmapped ones', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [
        { name: 'message', type: 'null' },
        { name: 'body.text', type: 'text' },
      ],
      values: [],
    });

    const schema = await getEsqlColumnSchema({
      esClient,
      signal,
      index: 'logs-*',
      fields: ['message', 'body.text'],
    });

    expect(query.mock.calls[0][0].query).toBe(
      'SET unmapped_fields = "NULLIFY"; FROM logs-* | KEEP message, body.text | LIMIT 0'
    );
    expect(schema).toEqual([{ name: 'body.text', type: 'text' }]);
  });

  it('filters the no-fields placeholder column', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [{ name: '<no-fields>', type: 'null' }],
      values: [],
    });

    const schema = await getEsqlColumnSchema({ esClient, signal, index: 'missing-*' });

    expect(schema).toEqual([]);
  });
});
