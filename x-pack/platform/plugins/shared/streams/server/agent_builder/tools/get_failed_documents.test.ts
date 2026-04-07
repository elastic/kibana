/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  createGetFailedDocumentsTool,
  isNotFoundError,
  formatFailedDocuments,
} from './get_failed_documents';
import { createMockGetScopedClients, createMockToolContext } from './test_helpers';

describe('createGetFailedDocumentsTool handler', () => {
  const setup = () => {
    const { getScopedClients, esClient } = createMockGetScopedClients();
    const tool = createGetFailedDocumentsTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, esClient };
  };

  it('returns error breakdown and sample documents', async () => {
    const { tool, context, esClient } = setup();

    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [
          {
            _index: 'logs::failures',
            _id: '1',
            _source: {
              '@timestamp': '2024-01-01T00:00:00Z',
              document: { source: { 'host.name': 'h1', message: 'test' } },
              error: { type: 'mapper_exception', message: 'failed to parse field' },
            },
          },
        ],
        total: { value: 42 },
      },
      aggregations: {
        error_types: {
          buckets: [
            { key: 'mapper_exception', doc_count: 30 },
            { key: 'illegal_argument_exception', doc_count: 12 },
          ],
        },
      },
    } as unknown as SearchResponse);

    const result = await tool.handler(
      { name: 'logs', start: 'now-24h', end: 'now', size: 10 },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.stream).toBe('logs');
      expect(data.total_failed).toBe(42);
      expect(data.error_type_breakdown).toEqual([
        { type: 'mapper_exception', count: 30 },
        { type: 'illegal_argument_exception', count: 12 },
      ]);
      expect(data.returned_count).toBe(1);
      const samples = data.sample_documents as Array<Record<string, unknown>>;
      expect(samples[0].error_type).toBe('mapper_exception');
      expect(samples[0].error_message).toBe('failed to parse field');
      expect(samples[0].original_document).toEqual({ 'host.name': 'h1', message: 'test' });
    }
  });

  it('returns zero failures when failure store returns 404', async () => {
    const { tool, context, esClient } = setup();

    esClient.search.mockRejectedValue(
      Object.assign(new Error('index_not_found_exception'), { statusCode: 404 })
    );

    const result = await tool.handler(
      { name: 'logs', start: 'now-24h', end: 'now', size: 10 },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.total_failed).toBe(0);
      expect(data.sample_documents).toEqual([]);
      expect(data.note).toContain('No failure store exists');
    }
  });

  it('caps size at MAX_SAMPLE_SIZE (50)', async () => {
    const { tool, context, esClient } = setup();

    esClient.search.mockResolvedValueOnce({
      hits: { hits: [], total: { value: 0 } },
      aggregations: { error_types: { buckets: [] } },
    } as unknown as SearchResponse);

    await tool.handler({ name: 'logs', start: 'now-24h', end: 'now', size: 200 }, context);

    expect(esClient.search).toHaveBeenCalledTimes(1);
    const call = esClient.search.mock.calls[0][0];
    expect((call as { size: number }).size).toBe(50);
  });

  it('returns classified error for non-404 failures', async () => {
    const { tool, context, esClient } = setup();

    esClient.search.mockRejectedValue(
      Object.assign(new Error('security_exception: unauthorized'), { statusCode: 403 })
    );

    const result = await tool.handler(
      { name: 'logs', start: 'now-24h', end: 'now', size: 10 },
      context
    );

    if ('results' in result) {
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('logs');
      expect(data.likely_cause).toContain('permissions');
    }
  });
});

describe('isNotFoundError', () => {
  it('returns true for statusCode 404', () => {
    expect(isNotFoundError(Object.assign(new Error('not found'), { statusCode: 404 }))).toBe(true);
  });

  it('returns true for index_not_found_exception in message', () => {
    expect(isNotFoundError(new Error('index_not_found_exception: no such index'))).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isNotFoundError(new Error('security_exception'))).toBe(false);
  });
});

describe('formatFailedDocuments', () => {
  it('extracts error metadata and original document', () => {
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          document: { source: { field: 'value' } },
          error: { type: 'mapper_exception', message: 'bad field' },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    expect(result[0]).toEqual({
      '@timestamp': '2024-01-01T00:00:00Z',
      error_type: 'mapper_exception',
      error_message: 'bad field',
      original_document: { field: 'value' },
    });
  });

  it('truncates long stack traces', () => {
    const longTrace = 'x'.repeat(1000);
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          error: { type: 'error', message: 'fail', stack_trace: longTrace },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    const trace = result[0].error_stack_trace as string;
    expect(trace.length).toBe(503);
    expect(trace.endsWith('...')).toBe(true);
  });

  it('truncates long strings in original document source', () => {
    const longVal = 'y'.repeat(500);
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          document: { source: { msg: longVal } },
          error: { type: 'error', message: 'fail' },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    const doc = result[0].original_document as Record<string, unknown>;
    expect((doc.msg as string).length).toBe(203);
    expect((doc.msg as string).endsWith('...')).toBe(true);
  });

  it('flattens nested original document fields', () => {
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          document: { source: { host: { name: 'h1' } } },
          error: { type: 'error', message: 'fail' },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    const doc = result[0].original_document as Record<string, unknown>;
    expect(doc['host.name']).toBe('h1');
  });

  it('handles hits without _source', () => {
    const hits = [{ _source: undefined }];
    const result = formatFailedDocuments(hits as Array<{ _source?: Record<string, unknown> }>);
    expect(result[0]).toEqual({
      '@timestamp': undefined,
      error_type: undefined,
      error_message: undefined,
    });
  });

  it('omits stack_trace key when not present', () => {
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          error: { type: 'error', message: 'fail' },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    expect(result[0]).not.toHaveProperty('error_stack_trace');
  });

  it('omits original_document key when document.source is missing', () => {
    const hits = [
      {
        _source: {
          '@timestamp': '2024-01-01T00:00:00Z',
          error: { type: 'error', message: 'fail' },
        },
      },
    ];
    const result = formatFailedDocuments(hits);
    expect(result[0]).not.toHaveProperty('original_document');
  });
});
