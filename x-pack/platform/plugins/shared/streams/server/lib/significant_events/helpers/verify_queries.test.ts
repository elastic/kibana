/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { Streams } from '@kbn/streams-schema';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { verifyQueries } from './verify_queries';

const logsStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs',
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    wired: {
      fields: {},
      routing: [],
    },
    lifecycle: { inherit: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    failure_store: { inherit: {} },
  },
};

describe('verifyQueries', () => {
  let esClientMock: ElasticsearchClientMock;
  let loggerMock: jest.Mocked<MockedLogger>;
  let abortCtrl: AbortController;

  beforeEach(() => {
    loggerMock = loggingSystemMock.createLogger();
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    abortCtrl = new AbortController();
  });

  it('filters out the invalid queries', async () => {
    esClientMock.search.mockResolvedValue({
      took: 10,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 42, relation: 'eq' }, hits: [] },
    });
    const esClient = createTracedEsClient({
      client: esClientMock,
      logger: loggerMock,
      abortSignal: abortCtrl.signal,
    });

    const result = await verifyQueries(
      {
        definition: logsStreamDefinition,
        end: 1000,
        start: 0,
        queries: [
          { kql: 'message:good', title: 'good query' },
          { kql: 'message:*"invalid"* and something', title: 'bad query' },
        ],
      },
      { esClient, logger: loggerMock }
    );

    expect(result).toEqual({
      totalCount: 42,
      queries: [{ kql: 'message:good', title: 'good query', count: 42 }],
    });
  });

  it('handles any search error gracefully', async () => {
    esClientMock.search.mockRejectedValue(new Error('timeout error'));
    const esClient = createTracedEsClient({
      client: esClientMock,
      logger: loggerMock,
      abortSignal: abortCtrl.signal,
    });

    const result = await verifyQueries(
      {
        definition: logsStreamDefinition,
        end: 1000,
        start: 0,
        queries: [{ kql: 'message:irrelevant', title: 'irrelevant' }],
      },
      { esClient, logger: loggerMock }
    );

    expect(result).toEqual({
      totalCount: 0,
      queries: [{ kql: 'message:irrelevant', title: 'irrelevant', count: 0 }],
    });
  });
});
