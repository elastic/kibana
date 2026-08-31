/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceSpan } from './types';
import { getSpanBadge, getSpanCategory, SPAN_COLORS } from './get_span_category';

describe('getSpanCategory', () => {
  const span = (overrides: Partial<TraceSpan>): TraceSpan => ({
    span_id: 's1',
    trace_id: 't1',
    name: 'generic',
    start_time: '2025-01-01T00:00:00.000Z',
    duration_ms: 10,
    ...overrides,
  });

  it('classifies Agent Builder execute_tool spans as tool, not llm', () => {
    expect(
      getSpanCategory(
        span({
          name: 'execute_tool platform.core.execute_esql',
          attributes: {
            'gen_ai.operation.name': 'execute_tool',
            'gen_ai.tool.name': 'platform.core.execute_esql',
            'elastic.inference.span.kind': 'TOOL',
          },
        })
      )
    ).toBe('tool');
  });

  it('classifies chat spans as llm', () => {
    expect(
      getSpanCategory(
        span({
          name: 'chat gpt-4.1',
          attributes: {
            'gen_ai.operation.name': 'chat',
            'elastic.inference.span.kind': 'LLM',
          },
        })
      )
    ).toBe('llm');
  });

  it('does not treat mere presence of gen_ai.operation.name as llm', () => {
    expect(
      getSpanCategory(
        span({
          name: 'execute_tool search',
          attributes: { 'gen_ai.operation.name': 'execute_tool' },
        })
      )
    ).toBe('tool');
  });

  it('classifies search and http by name/attributes', () => {
    expect(getSpanCategory(span({ name: 'esql-retrieval' }))).toBe('search');
    expect(getSpanCategory(span({ name: 'POST /api/data' }))).toBe('http');
    expect(getSpanCategory(span({ name: 'internal-processing' }))).toBe('other');
  });
});

describe('getSpanBadge', () => {
  const span = (overrides: Partial<TraceSpan>): TraceSpan => ({
    span_id: 's1',
    trace_id: 't1',
    name: 'generic',
    start_time: '2025-01-01T00:00:00.000Z',
    duration_ms: 10,
    ...overrides,
  });

  it('returns TOOL badge for execute_tool spans', () => {
    expect(
      getSpanBadge(
        span({
          name: 'execute_tool platform.core.execute_esql',
          attributes: {
            'gen_ai.operation.name': 'execute_tool',
            'gen_ai.tool.name': 'platform.core.execute_esql',
          },
        })
      )
    ).toEqual({ label: 'TOOL', color: SPAN_COLORS.tool });
  });

  it('returns LLM badge for chat spans', () => {
    expect(
      getSpanBadge(
        span({
          name: 'chat gpt-4.1',
          attributes: { 'gen_ai.operation.name': 'chat' },
        })
      )
    ).toEqual({ label: 'LLM', color: SPAN_COLORS.llm });
  });
});
