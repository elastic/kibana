/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapEsSourceToTraceSpan } from './map_es_source_to_trace_span';

describe('mapEsSourceToTraceSpan', () => {
  it('maps traces source fields into a TraceSpan', () => {
    const span = mapEsSourceToTraceSpan(
      {
        span_id: 'span-1',
        trace_id: 'trace-1',
        parent_span_id: 'parent-1',
        name: 'llm.chat',
        kind: 'CLIENT',
        status: { code: 1 },
        '@timestamp': '2026-01-01T00:00:00.000Z',
        end_time: '2026-01-01T00:00:01.000Z',
        duration: 250_000_000,
        attributes: { 'gen_ai.request.model': 'gpt-4.1' },
      },
      'hit-1'
    );

    expect(span).toEqual({
      span_id: 'span-1',
      trace_id: 'trace-1',
      parent_span_id: 'parent-1',
      name: 'llm.chat',
      kind: 'CLIENT',
      status: '1',
      start_time: '2026-01-01T00:00:00.000Z',
      end_time: '2026-01-01T00:00:01.000Z',
      duration_ms: 250,
      attributes: { 'gen_ai.request.model': 'gpt-4.1' },
    });
  });

  it('falls back to defaults when optional source fields are missing', () => {
    const span = mapEsSourceToTraceSpan({}, 'hit-id');

    expect(span).toEqual({
      span_id: 'hit-id',
      trace_id: '',
      parent_span_id: undefined,
      name: 'unknown',
      kind: undefined,
      status: undefined,
      start_time: '',
      end_time: undefined,
      duration_ms: 0,
      attributes: {},
    });
  });

  it('falls back to an empty span_id when source and hit id are both missing', () => {
    const span = mapEsSourceToTraceSpan({}, undefined);

    expect(span).toEqual({
      span_id: '',
      trace_id: '',
      parent_span_id: undefined,
      name: 'unknown',
      kind: undefined,
      status: undefined,
      start_time: '',
      end_time: undefined,
      duration_ms: 0,
      attributes: {},
    });
  });
});
