/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceSpan } from './types';

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

interface TraceSpanSource {
  span_id?: string;
  parent_span_id?: string;
  trace_id?: string;
  name?: string;
  kind?: string;
  status?: { code?: string | number };
  '@timestamp'?: string;
  end_time?: string;
  duration?: number;
  attributes?: Record<string, unknown>;
}

export const mapEsSourceToTraceSpan = (source: TraceSpanSource, id?: string): TraceSpan => ({
  span_id: source.span_id ?? id ?? '',
  trace_id: source.trace_id ?? '',
  parent_span_id: source.parent_span_id,
  name: source.name ?? 'unknown',
  kind: source.kind,
  status: source.status?.code != null ? String(source.status.code) : undefined,
  start_time: source['@timestamp'] ?? '',
  end_time: source.end_time,
  duration_ms: (source.duration ?? 0) / NANOSECONDS_PER_MILLISECOND,
  attributes: source.attributes ?? {},
});
