/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getMappingConflicts } from './get_mapping_conflicts';

const signal = new AbortController().signal;

const createEsClient = () => {
  const query = jest.fn();
  return {
    esClient: { esql: { query } } as unknown as ElasticsearchClient,
    query,
  };
};

describe('getMappingConflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('probes the full source with no time filter', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({ columns: [], values: [] });

    await getMappingConflicts({ esClient, signal, index: 'logs-*' });

    expect(query).toHaveBeenCalledWith({ query: 'FROM logs-* | LIMIT 0' }, { signal });
    expect(query.mock.calls[0][0]).not.toHaveProperty('filter');
  });

  it('returns only fields with more than one original type, sorted, with the suggested cast', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'message', type: 'text' },
        {
          name: 'exception.message',
          type: 'unsupported',
          original_types: ['text', 'keyword'],
          suggested_cast: 'keyword',
        },
        {
          name: 'client.ip',
          type: 'unsupported',
          original_types: ['ip', 'keyword'],
          suggested_cast: 'keyword',
        },
      ],
      values: [],
    });

    const conflicts = await getMappingConflicts({ esClient, signal, index: 'logs-*' });

    expect(conflicts).toEqual([
      { field: 'exception.message', types: ['keyword', 'text'], suggestedCast: 'keyword' },
      { field: 'client.ip', types: ['ip', 'keyword'], suggestedCast: 'keyword' },
    ]);
  });

  it('omits suggestedCast when ES does not provide one', async () => {
    const { esClient, query } = createEsClient();
    query.mockResolvedValueOnce({
      columns: [
        {
          name: 'host.name',
          type: 'unsupported',
          original_types: ['ip', 'keyword'],
        },
      ],
      values: [],
    });

    const conflicts = await getMappingConflicts({ esClient, signal, index: 'logs-*' });

    expect(conflicts).toEqual([{ field: 'host.name', types: ['ip', 'keyword'] }]);
  });
});
