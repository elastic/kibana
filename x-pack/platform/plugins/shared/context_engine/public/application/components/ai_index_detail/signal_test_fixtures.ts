/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Signal } from '../../../../common/http_api/signals';

/** Test-only factory for a `tool_call` signal, defaulting to an errored `query_error` signal. */
export const buildSignal = (
  overrides: Partial<Signal['data']> = {},
  tags = ['query_error']
): Signal => ({
  signal_id: 'sig-1',
  '@timestamp': '2026-08-01T00:00:00.000Z',
  trace_ids: ['trace-1'],
  signal_type: 'tool_call',
  tags,
  data: {
    tool: 'esql',
    query_kind: 'ki_retrieval',
    target_index: 'ai-index-ds-support',
    status: 'Error',
    looped: true,
    fell_back_to_raw: true,
    producer: 'agent-builder',
    span_id: 'span-1',
    conversation_id: 'conv-1',
    agent: { id: 'a1', name: 'Support', class: 'user' },
    query: 'FROM ai-index-ds-support | LIMIT 10',
    returned: { columns: [], row_count: 0 },
    error: 'boom',
    duration_ms: 42,
    round_signals: { esql_count: 2, raw_query_count: 1, ki_retrieval_count: 1 },
    ...overrides,
  },
});
