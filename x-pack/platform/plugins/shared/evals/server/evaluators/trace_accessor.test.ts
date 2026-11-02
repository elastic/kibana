/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createTraceAccessor } from './trace_accessor';

describe('createTraceAccessor', () => {
  const validTraceId = '0af7651916cd43dd8448eb211c80319c';

  const createEsClient = () => {
    const searchMock = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const esClient = {
      search: searchMock,
    } as unknown as ElasticsearchClient;
    return { esClient, searchMock };
  };

  describe('runSearch', () => {
    it('builds trace-scoped DSL query for traces source', async () => {
      const { esClient, searchMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await accessor.runSearch('traces', {
        filter: [{ type: 'term', field: 'attributes.elastic.inference.span.kind', value: 'TOOL' }],
        fields: ['@timestamp', 'attributes.gen_ai.tool.name'],
        sort: [
          { field: '@timestamp', order: 'asc' },
          { field: 'span_id', order: 'asc', unmappedType: 'keyword' },
        ],
        size: 10,
        trackTotalHits: 21,
      });

      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith({
        index: 'traces-*',
        ignore_unavailable: true,
        _source: ['@timestamp', 'attributes.gen_ai.tool.name'],
        size: 10,
        track_total_hits: 21,
        aggs: undefined,
        sort: [
          { '@timestamp': { order: 'asc' } },
          { span_id: { order: 'asc', unmapped_type: 'keyword' } },
        ],
        query: {
          bool: {
            filter: [
              { term: { 'trace.id': validTraceId } },
              { term: { 'attributes.elastic.inference.span.kind': 'TOOL' } },
            ],
          },
        },
      });
    });

    it('builds trace-scoped DSL query for logs source with exists filter', async () => {
      const { esClient, searchMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await accessor.runSearch('logs', {
        filter: [
          { type: 'term', field: 'event_name', value: 'gen_ai.user.message' },
          { type: 'exists', field: 'attributes.content' },
        ],
        fields: ['@timestamp', 'attributes.content'],
        sort: { field: '@timestamp', order: 'desc' },
        size: 1,
      });

      expect(searchMock).toHaveBeenCalledWith({
        index: 'logs-*',
        ignore_unavailable: true,
        _source: ['@timestamp', 'attributes.content'],
        size: 1,
        aggs: undefined,
        sort: [{ '@timestamp': { order: 'desc' } }],
        query: {
          bool: {
            filter: [
              { term: { trace_id: validTraceId } },
              { term: { event_name: 'gen_ai.user.message' } },
              { exists: { field: 'attributes.content' } },
            ],
          },
        },
      });
    });

    it('passes aggregations through and returns aggregation values', async () => {
      const { esClient, searchMock } = createEsClient();
      searchMock.mockResolvedValueOnce({
        hits: { hits: [] },
        aggregations: {
          input_tokens: { value: 321 },
        },
      });
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await expect(
        accessor.runSearch<{ input_tokens?: { value?: number } }>('traces', {
          size: 0,
          aggs: {
            input_tokens: {
              sum: { field: 'attributes.gen_ai.usage.input_tokens' },
            },
          },
        })
      ).resolves.toEqual({
        documents: [],
        aggregations: {
          input_tokens: { value: 321 },
        },
      });
    });

    it('returns hit metadata with _source documents', async () => {
      const { esClient, searchMock } = createEsClient();
      searchMock.mockResolvedValueOnce({
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            {
              _id: 'doc-1',
              _index: 'logs-evals-default',
              sort: [1782468000000],
              _source: { '@timestamp': '2026-06-26T10:00:00.000Z', 'attributes.content': 'hello' },
            },
            { _source: undefined },
          ],
        },
      });
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await expect(accessor.runSearch('logs', { size: 2 })).resolves.toEqual({
        documents: [
          {
            id: 'doc-1',
            index: 'logs-evals-default',
            sort: [1782468000000],
            source: {
              '@timestamp': '2026-06-26T10:00:00.000Z',
              'attributes.content': 'hello',
            },
          },
        ],
        total: 2,
        aggregations: undefined,
      });
    });

    it('throws before calling search when trace_id is invalid', async () => {
      const { esClient, searchMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: 'not-a-valid-hex-trace-id', esClient });

      await expect(accessor.runSearch('logs', { size: 1 })).rejects.toThrow(
        'Invalid trace_id: must be a 32-character hex string'
      );
      expect(searchMock).not.toHaveBeenCalled();
    });
  });
});
