/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { describeDataset } from '.';

const createEsClient = () => {
  const query = jest.fn();
  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

const schemaResponse = ({
  columns = [
    { name: '@timestamp', type: 'date' },
    { name: 'message', type: 'text' },
    { name: 'host.name', type: 'keyword' },
  ],
}: {
  columns?: Array<{ name: string; type: string; original_types?: string[] }>;
} = {}) => ({
  columns,
  values: [],
});

const hitsResponse = ({
  values = [
    ['doc-1', { message: 'hello', host: { name: 'host-a' } }],
    ['doc-2', { message: 'hello', host: { name: 'host-b' } }],
  ],
}: {
  values?: unknown[][];
} = {}) => ({
  columns: [
    { name: '_id', type: 'keyword' },
    { name: '_source', type: 'object' },
  ],
  values,
});

const countResponse = (total: number) => ({
  columns: [{ name: 'total', type: 'long' }],
  values: [[total]],
});

describe('describeDataset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges ES|QL schema columns with sampled documents', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(hitsResponse())
      .mockResolvedValueOnce(countResponse(2));

    const analysis = await describeDataset({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
    });

    expect(query.mock.calls[0][0].query).toBe('FROM logs-* | LIMIT 0');
    expect(query.mock.calls[1][0].query).toBe('FROM logs-* METADATA _id, _source | LIMIT 1000');
    expect(query.mock.calls[2][0].query).toBe('FROM logs-* | STATS total = COUNT(*)');
    expect(analysis.total).toBe(2);
    expect(analysis.sampled).toBe(2);
    expect(analysis.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'message',
          types: ['text'],
          cardinality: 1,
          documentsWithValue: 2,
          values: [{ value: 'hello', count: 2 }],
        }),
        expect.objectContaining({
          name: 'host.name',
          types: ['keyword'],
          cardinality: 2,
          documentsWithValue: 2,
        }),
      ])
    );
  });

  it('uses the population count instead of sampled hit count for total', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(schemaResponse())
      .mockResolvedValueOnce(hitsResponse({ values: [['doc-1', { message: 'hello' }]] }))
      .mockResolvedValueOnce(countResponse(15_000));

    const analysis = await describeDataset({
      esClient,
      index: 'logs-*',
      start: 100,
      end: 200,
    });

    expect(analysis.sampled).toBe(1);
    expect(analysis.total).toBe(15_000);
  });

  it('uses original types for unsupported cross-index columns', async () => {
    const { esClient, query } = createEsClient();
    query
      .mockResolvedValueOnce(
        schemaResponse({
          columns: [{ name: 'host.name', type: 'unsupported', original_types: ['ip', 'keyword'] }],
        })
      )
      .mockResolvedValueOnce(hitsResponse({ values: [['doc-1', { host: { name: '127.0.0.1' } }]] }))
      .mockResolvedValueOnce(countResponse(1));

    const analysis = await describeDataset({
      esClient,
      index: ['logs-a', 'logs-b'],
      start: 100,
      end: 200,
    });

    expect(analysis.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'host.name',
          types: ['ip', 'keyword'],
        }),
      ])
    );
  });
});
