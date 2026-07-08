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
    const queryMock = jest.fn().mockResolvedValue({ columns: [], values: [] });
    const esClient = {
      esql: { query: queryMock },
    } as unknown as ElasticsearchClient;
    return { esClient, queryMock };
  };

  describe('source resolution', () => {
    it('builds FROM traces-* with trace.id field for "traces" source', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await accessor.runEsql('traces', '| STATS count = COUNT(*)');

      const { query } = queryMock.mock.calls[0][0];
      expect(query).toContain('FROM traces-*');
      expect(query).toContain('trace.id == ?trace_id');
    });

    it('builds FROM logs-* with trace_id field for "logs" source', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await accessor.runEsql('logs', '| WHERE event_name == "gen_ai.user.message"\n| LIMIT 1');

      const { query } = queryMock.mock.calls[0][0];
      expect(query).toContain('FROM logs-*');
      expect(query).toContain('trace_id == ?trace_id');
    });
  });

  describe('pipeline passthrough', () => {
    it('appends the caller pipeline after the scoping WHERE', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });
      const pipeline =
        '| WHERE attributes.elastic.inference.span.kind == "TOOL"\n| STATS tool_call_count = COUNT(*)';

      await accessor.runEsql('traces', pipeline);

      const { query } = queryMock.mock.calls[0][0];
      expect(query).toContain('attributes.elastic.inference.span.kind == "TOOL"');
      expect(query).toContain('STATS tool_call_count = COUNT(*)');
      expect(query.indexOf('trace.id == ?trace_id')).toBeLessThan(
        query.indexOf('attributes.elastic.inference.span.kind')
      );
    });
  });

  describe('parameter binding', () => {
    it('passes trace_id as a bound ES|QL parameter, never interpolated into the query', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: validTraceId, esClient });

      await accessor.runEsql('traces', '| STATS count = COUNT(*)');

      const call = queryMock.mock.calls[0][0];
      expect(call.query).toContain('?trace_id');
      expect(call.query).not.toContain(validTraceId);
      expect(call.params).toEqual([{ trace_id: validTraceId }]);
    });

    it('does not embed a hostile trace_id value in the query string', async () => {
      const hostileId = '0af7651916cd43dd8448eb211c80319c';
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: hostileId, esClient });

      await accessor.runEsql('traces', '| STATS count = COUNT(*)');

      const { query, params } = queryMock.mock.calls[0][0];
      expect(query).not.toContain(hostileId);
      expect(params).toEqual([{ trace_id: hostileId }]);
    });
  });

  describe('trace_id validation (defense-in-depth)', () => {
    it('throws before calling ES when trace_id is not valid hex', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({ traceId: 'not-a-valid-hex-trace-id', esClient });

      await expect(accessor.runEsql('traces', '| STATS count = COUNT(*)')).rejects.toThrow(
        'Invalid trace_id: must be a 32-character hex string'
      );
      expect(queryMock).not.toHaveBeenCalled();
    });

    it('throws for trace_id with injection payload', async () => {
      const { esClient, queryMock } = createEsClient();
      const accessor = createTraceAccessor({
        traceId: 'x" OR true OR trace.id == "',
        esClient,
      });

      await expect(accessor.runEsql('traces', '| STATS count = COUNT(*)')).rejects.toThrow(
        'Invalid trace_id: must be a 32-character hex string'
      );
      expect(queryMock).not.toHaveBeenCalled();
    });
  });
});
