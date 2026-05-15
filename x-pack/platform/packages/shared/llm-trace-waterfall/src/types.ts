/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface TraceSpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string;
  name: string;
  kind?: string;
  status?: string;
  start_time: string;
  end_time?: string;
  duration_ms: number;
  attributes?: Record<string, unknown>;
}

export interface SpanNode extends TraceSpan {
  children: SpanNode[];
  depth: number;
}
