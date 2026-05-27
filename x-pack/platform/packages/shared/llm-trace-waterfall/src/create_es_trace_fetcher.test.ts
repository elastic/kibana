/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { of } from 'rxjs';
import { createEsTraceFetcher } from './create_es_trace_fetcher';
import { mapEsSourceToTraceSpan } from './map_es_source_to_trace_span';

describe('createEsTraceFetcher', () => {
  it('queries traces-*, maps spans, and computes total duration', async () => {
    const hits = [
      {
        _id: 'span-1',
        _source: {
          trace_id: 'trace-1',
          name: 'root',
          '@timestamp': '2026-01-01T00:00:00.000Z',
          duration: 2_000_000,
        },
      },
      {
        _id: 'span-2',
        _source: {
          trace_id: 'trace-1',
          name: 'child',
          '@timestamp': '2026-01-01T00:00:00.500Z',
          duration: 1_000_000,
        },
      },
    ];
    const search = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          hits: {
            hits,
          },
        },
      })
    );
    const fetchTrace = createEsTraceFetcher(
      search as unknown as DataPublicPluginStart['search']['search']
    );

    const result = await fetchTrace('trace-1');

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith({
      params: {
        index: 'traces-*',
        body: {
          query: { term: { trace_id: 'trace-1' } },
          sort: [{ '@timestamp': { order: 'asc' } }],
          size: 10000,
        },
      },
    });

    expect(result.spans).toEqual(hits.map((hit) => mapEsSourceToTraceSpan(hit._source, hit._id)));
    expect(result.durationMs).toBe(501);
  });
});
