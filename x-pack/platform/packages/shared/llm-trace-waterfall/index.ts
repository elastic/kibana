/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { TraceWaterfall, SpanDetail } from './src/trace_waterfall';
export type { TraceWaterfallProps } from './src/trace_waterfall';
export type { TraceSpan, SpanNode } from './src/types';
export { mapEsSourceToTraceSpan } from './src/map_es_source_to_trace_span';
export { createEsTraceFetcher } from './src/create_es_trace_fetcher';
export { useTraceSpans } from './src/use_trace_spans';
export type { TraceFetcher } from './src/use_trace_spans';
