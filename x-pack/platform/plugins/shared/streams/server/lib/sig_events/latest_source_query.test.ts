/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { runLatestSourceEsqlQuery } from './latest_source_query';

describe('runLatestSourceEsqlQuery', () => {
  it('builds a latest-source query with multi-field grouping', async () => {
    const queryMock = jest.fn().mockResolvedValue({
      columns: [{ name: '_source', type: 'unsupported' }],
      values: [[{ id: 'feature-id', kibana: { space_ids: ['default'] } }]],
    });
    const esClient = { esql: { query: queryMock } } as unknown as ElasticsearchClient;

    const { hits } = await runLatestSourceEsqlQuery<{ id: string }>({
      esClient,
      space: 'default',
      options: {},
      index: '.streams-knowledge-indicators',
      groupBy: ['stream.name', 'type', 'id'],
    });

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].query).toContain('BY `stream.name`, type, id');
    expect(hits).toEqual([{ id: 'feature-id' }]);
  });

  it('returns empty hits when the backing data stream does not exist yet', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValue(
        new Error(
          'verification_exception Root causes: verification_exception: Unknown index [.significant_events-knowledge_indicators]'
        )
      );
    const esClient = { esql: { query: queryMock } } as unknown as ElasticsearchClient;

    const { hits } = await runLatestSourceEsqlQuery<{ id: string }>({
      esClient,
      space: 'default',
      options: {},
      index: '.significant_events-knowledge_indicators',
      groupBy: ['stream.name', 'type', 'id'],
    });

    expect(hits).toEqual([]);
  });

  it('rethrows non-missing-index ES|QL errors', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValue(new Error('verification_exception: Unknown column [nonexistent.field]'));
    const esClient = { esql: { query: queryMock } } as unknown as ElasticsearchClient;

    await expect(
      runLatestSourceEsqlQuery<{ id: string }>({
        esClient,
        space: 'default',
        options: {},
        index: '.significant_events-knowledge_indicators',
        groupBy: ['stream.name', 'type', 'id'],
      })
    ).rejects.toThrow('Unknown column');
  });
});
