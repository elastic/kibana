/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getEsqlColumnSchema } from './get_esql_column_schema';

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

    await getEsqlColumnSchema({ esClient, index: 'logs-*' });

    expect(query).toHaveBeenCalledWith({
      query: 'FROM logs-* | LIMIT 0',
    });
  });

  it('never passes drop_null_columns: true (regression: ES prunes every column when LIMIT 0)', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, index: 'logs-*', start: 100, end: 200 });

    expect(query.mock.calls[0][0]).not.toHaveProperty('drop_null_columns');
  });

  it('queries multiple indices', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, index: ['logs-a', 'logs-b'] });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-a, logs-b | LIMIT 0');
  });

  it('passes a time range filter only when both bounds are provided', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, index: 'logs-*', start: 100, end: 200 });

    expect(query.mock.calls[0][0]).toEqual({
      query: 'FROM logs-* | LIMIT 0',
      filter: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 100,
                  lte: 200,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    });
  });

  it('omits the filter when only one bound is provided', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getEsqlColumnSchema({ esClient, index: 'logs-*', start: 100 });

    expect(query.mock.calls[0][0]).not.toHaveProperty('filter');
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

    const schema = await getEsqlColumnSchema({ esClient, index: 'logs-*' });

    expect(schema).toEqual([
      { name: '@timestamp', type: 'date' },
      { name: 'message', type: 'text' },
      { name: 'host.name', type: 'unsupported', originalTypes: ['ip', 'keyword'] },
    ]);
  });

  it('filters the no-fields placeholder column', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [{ name: '<no-fields>', type: 'null' }],
      values: [],
    });

    const schema = await getEsqlColumnSchema({ esClient, index: 'missing-*' });

    expect(schema).toEqual([]);
  });
});
