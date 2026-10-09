/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classify } from './classify';
import type { EsqlToolCallSignal } from '../../common/http_api/signals';

const buildSignal = (data: Partial<EsqlToolCallSignal['data']> = {}): EsqlToolCallSignal => ({
  signal_id: 'trace-1:span-1',
  '@timestamp': '2026-07-08T12:10:30.000Z',
  trace_ids: ['trace-1'],
  signal_type: 'tool_call',
  tags: [],
  data: {
    tool: 'platform.core.execute_esql',
    query_kind: 'raw_access',
    target_index: 'logs-*',
    status: 'Ok',
    looped: false,
    fell_back_to_raw: true,
    producer: 'trace_tool',
    span_id: 'span-1',
    conversation_id: 'conversation-1',
    agent: { id: 'agent-1', name: 'support-agent', class: 'user' },
    query: 'FROM logs-* | LIMIT 10',
    returned: { columns: ['message'], row_count: 1 },
    duration_ms: 12,
    round_signals: { esql_count: 1, raw_query_count: 1, ki_retrieval_count: 0 },
    ...data,
  },
});

describe('classify', () => {
  it('skips management-agent signals entirely (matched by id via class)', () => {
    const signal = buildSignal({
      agent: { id: 'platform.context_engine.agent', name: 'Context Engine', class: 'management' },
      status: 'Error',
    });
    expect(classify(signal)).toEqual([]);
  });

  it('tags a failed query as query_error', () => {
    expect(classify(buildSignal({ status: 'Error' }))).toContain('query_error');
  });

  it('tags a zero-row retrieval as empty_retrieval', () => {
    const signal = buildSignal({
      query_kind: 'ki_retrieval',
      returned: { columns: [], row_count: 0 },
    });
    expect(classify(signal)).toContain('empty_retrieval');
  });

  it('does not tag a non-query tool call (query_kind "other") as empty_retrieval', () => {
    const signal = buildSignal({
      query_kind: 'other',
      target_index: '',
      returned: { columns: [], row_count: 0 },
    });
    expect(classify(signal)).not.toContain('empty_retrieval');
  });

  it('tags raw access as coverage_gap', () => {
    expect(classify(buildSignal({ query_kind: 'raw_access' }))).toContain('coverage_gap');
  });

  it('does not also tag a failed query as empty_retrieval (outcome tags are mutually exclusive)', () => {
    const tags = classify(
      buildSignal({
        status: 'Error',
        query_kind: 'ki_retrieval',
        returned: { columns: [], row_count: 0 },
      })
    );
    expect(tags).toContain('query_error');
    expect(tags).not.toContain('empty_retrieval');
  });

  it('combines an outcome tag with the orthogonal coverage_gap tag', () => {
    // A failed raw-access query: one outcome tag (query_error) + the "how" tag (coverage_gap),
    // but NOT empty_retrieval — the 0 rows are a consequence of the error, not an empty result.
    const tags = classify(
      buildSignal({
        status: 'Error',
        query_kind: 'raw_access',
        returned: { columns: [], row_count: 0 },
      })
    );
    expect([...tags].sort()).toEqual(['coverage_gap', 'query_error'].sort());
  });

  it('leaves a clean signal untagged', () => {
    const signal = buildSignal({
      query_kind: 'ki_retrieval',
      status: 'Ok',
      returned: { columns: ['title'], row_count: 3 },
    });
    expect(classify(signal)).toEqual([]);
  });
});
