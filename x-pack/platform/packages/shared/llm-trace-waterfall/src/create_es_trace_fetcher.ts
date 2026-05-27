/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { mapEsSourceToTraceSpan } from './map_es_source_to_trace_span';
import type { TraceFetcher } from './use_trace_spans';

interface TraceSearchRequest {
  params: {
    index: string;
    body: {
      query: { term: { trace_id: string } };
      sort: Array<{ '@timestamp': { order: 'asc' | 'desc' } }>;
      size: number;
    };
  };
}

interface TraceSearchHit {
  _id: string;
  _source: Record<string, unknown>;
}

interface TraceSearchResponse {
  rawResponse?: {
    hits?: {
      hits?: TraceSearchHit[];
    };
  };
}

const TRACES_INDEX_PATTERN = 'traces-*';
const MAX_SPANS_PER_TRACE = 10_000;

const getDurationMs = (spans: Array<{ start_time: string; duration_ms: number }>): number => {
  if (spans.length === 0) {
    return 0;
  }

  const startTimes = spans.map((span) => new Date(span.start_time).getTime());
  const endTimes = spans.map((span) => new Date(span.start_time).getTime() + span.duration_ms);

  return Math.max(...endTimes) - Math.min(...startTimes);
};

export const createEsTraceFetcher = (
  search: DataPublicPluginStart['search']['search']
): TraceFetcher => {
  return async (traceId: string) => {
    const request: TraceSearchRequest = {
      params: {
        index: TRACES_INDEX_PATTERN,
        body: {
          query: { term: { trace_id: traceId } },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: MAX_SPANS_PER_TRACE,
        },
      },
    };

    const response = (await lastValueFrom(search(request))) as TraceSearchResponse;
    const hits = response.rawResponse?.hits?.hits ?? [];
    const spans = hits.map((hit) => mapEsSourceToTraceSpan(hit._source, hit._id));

    return {
      spans,
      durationMs: getDurationMs(spans),
    };
  };
};
