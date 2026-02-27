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

  it('filters out the invalid KQL queries', async () => {
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

  describe('ES|QL queries', () => {
    it('validates and executes native ES|QL queries', async () => {
      esClientMock.search.mockResolvedValue({
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 100, relation: 'eq' }, hits: [] },
      });
      esClientMock.esql.query.mockResolvedValue({
        columns: [{ name: 'count', type: 'long' }],
        values: [[15]],
      } as any);

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
            {
              kql: '',
              esql: 'FROM logs,logs.* | WHERE status_code >= 500',
              title: 'server errors',
            },
          ],
        },
        { esClient, logger: loggerMock }
      );

      expect(result).toEqual({
        totalCount: 100,
        queries: [
          {
            kql: '',
            esql: 'FROM logs,logs.* | WHERE status_code >= 500',
            title: 'server errors',
            count: 15,
          },
        ],
      });
    });

    it('filters out invalid ES|QL queries', async () => {
      esClientMock.search.mockResolvedValue({
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 100, relation: 'eq' }, hits: [] },
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
            {
              kql: '',
              esql: 'INVALID QUERY %%% SYNTAX ERROR',
              title: 'broken query',
            },
          ],
        },
        { esClient, logger: loggerMock }
      );

      expect(result).toEqual({
        totalCount: 0,
        queries: [],
      });
    });

    it('handles mixed KQL and ES|QL queries', async () => {
      esClientMock.search.mockResolvedValue({
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 200, relation: 'eq' }, hits: [] },
      });
      esClientMock.esql.query.mockResolvedValue({
        columns: [{ name: 'count', type: 'long' }],
        values: [[33]],
      } as any);

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
            { kql: 'status:error', title: 'kql query' },
            {
              kql: '',
              esql: 'FROM logs,logs.* | WHERE http.response.status_code >= 500',
              title: 'esql query',
            },
          ],
        },
        { esClient, logger: loggerMock }
      );

      expect(result.totalCount).toBe(200);
      expect(result.queries).toHaveLength(2);
      expect(result.queries[0]).toMatchObject({ kql: 'status:error', count: 200 });
      expect(result.queries[1]).toMatchObject({
        esql: 'FROM logs,logs.* | WHERE http.response.status_code >= 500',
        count: 33,
      });
    });

    it('handles ES|QL execution errors gracefully', async () => {
      esClientMock.search.mockResolvedValue({
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: { total: { value: 50, relation: 'eq' }, hits: [] },
      });
      esClientMock.esql.query.mockRejectedValue(new Error('esql execution timeout'));

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
            {
              kql: '',
              esql: 'FROM logs,logs.* | WHERE status_code >= 500',
              title: 'failing query',
            },
          ],
        },
        { esClient, logger: loggerMock }
      );

      expect(result).toEqual({
        totalCount: 50,
        queries: [
          {
            kql: '',
            esql: 'FROM logs,logs.* | WHERE status_code >= 500',
            title: 'failing query',
            count: 0,
          },
        ],
      });
    });
  });
});
