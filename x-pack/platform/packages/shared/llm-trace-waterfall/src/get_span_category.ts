/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceSpan } from './types';

export type SpanCategory = 'llm' | 'tool' | 'search' | 'http' | 'other';

export const SPAN_COLORS: Record<SpanCategory, string> = {
  llm: '#6DCCB1',
  tool: '#79AAD9',
  search: '#EE789D',
  http: '#B9A888',
  other: '#D6BF57',
};

/** Classifies GenAI spans by operation value before falling back to span metadata. */
export const getSpanCategory = (span: TraceSpan): SpanCategory => {
  const attrs = span.attributes;
  const operation = attrs?.['gen_ai.operation.name'];
  const inferenceKind = attrs?.['elastic.inference.span.kind'];

  if (operation === 'execute_tool' || inferenceKind === 'TOOL') {
    return 'tool';
  }

  if (operation === 'retrieval' || attrs?.['db.system'] != null) {
    return 'search';
  }

  if (
    typeof operation === 'string' ||
    inferenceKind === 'LLM' ||
    inferenceKind === 'AGENT' ||
    inferenceKind === 'CHAIN' ||
    attrs?.['gen_ai.provider.name'] != null ||
    attrs?.['gen_ai.system'] != null
  ) {
    return 'llm';
  }

  if (attrs?.['gen_ai.tool.name'] != null) {
    return 'tool';
  }

  if (attrs?.['http.method'] != null || attrs?.['http.request.method'] != null) {
    return 'http';
  }

  return 'other';
};

export const getSpanBadge = (span: TraceSpan): { label: string; color: string } | null => {
  const category = getSpanCategory(span);

  switch (category) {
    case 'llm':
      return { label: 'LLM', color: SPAN_COLORS.llm };
    case 'tool':
      return { label: 'TOOL', color: SPAN_COLORS.tool };
    case 'search':
      return { label: 'DB', color: SPAN_COLORS.search };
    case 'http':
      return { label: 'HTTP', color: SPAN_COLORS.http };
    default:
      return null;
  }
};
