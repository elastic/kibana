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

  it('prefers the explicit chat operation when the span name contains tool', () => {
    expect(
      getSpanCategory(
        span({
          name: 'chat gpt-4 (tool use)',
          attributes: { 'gen_ai.operation.name': 'chat' },
        })
      )
    ).toBe('llm');
  });

  it('prefers an explicit chat operation when tool metadata is also present', () => {
    expect(
      getSpanCategory(
        span({
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.tool.name': 'search',
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

  it.each(['chat', 'generate_content', 'text_completion', 'embeddings', 'invoke_agent'])(
    'classifies the %s GenAI operation as llm',
    (operation) => {
      expect(getSpanCategory(span({ attributes: { 'gen_ai.operation.name': operation } }))).toBe(
        'llm'
      );
    }
  );

  it('classifies custom GenAI operations and provider-only spans as llm', () => {
    expect(
      getSpanCategory(span({ attributes: { 'gen_ai.operation.name': 'custom_operation' } }))
    ).toBe('llm');
    expect(getSpanCategory(span({ attributes: { 'gen_ai.provider.name': 'openai' } }))).toBe('llm');
  });

  it('classifies retrieval, database, and http spans from attributes', () => {
    expect(getSpanCategory(span({ attributes: { 'gen_ai.operation.name': 'retrieval' } }))).toBe(
      'search'
    );
    expect(getSpanCategory(span({ attributes: { 'db.system': 'elasticsearch' } }))).toBe('search');
    expect(getSpanCategory(span({ attributes: { 'http.request.method': 'POST' } }))).toBe('http');
  });

  it('does not classify spans from their names', () => {
    expect(getSpanCategory(span({ name: 'execute_tool search' }))).toBe('other');
    expect(getSpanCategory(span({ name: 'chat gpt-4' }))).toBe('other');
    expect(getSpanCategory(span({ name: 'POST /api/data' }))).toBe('other');
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
