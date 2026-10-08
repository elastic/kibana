/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { prefetchDataSourceMetrics } from './prefetch_data_source_metrics';

describe('prefetchDataSourceMetrics', () => {
  it('prefers useful fields and applies dashboard time/query/filters', async () => {
    const esClient = {
      fieldCaps: jest.fn().mockResolvedValue({
        fields: {
          'request.id': { keyword: {} },
          'service.name': { keyword: {} },
          'event.duration': { long: {} },
          day_of_week: { integer: {} },
          '@timestamp': { date: {} },
        },
      }),
      search: jest.fn().mockImplementation(async ({ aggs }) => ({
        hits: { total: { value: 42 } },
        aggregations: Object.fromEntries(
          Object.keys(aggs).map((key) => {
            if (key.startsWith('terms_')) {
              return [key, { buckets: [{ key: 'checkout', doc_count: 20 }] }];
            }
            return [key, { avg: 12.5, min: 0, max: 90 }];
          })
        ),
      })),
    };

    const result = await prefetchDataSourceMetrics({
      esClient: esClient as never,
      dataSources: [
        {
          title: 'APM traces',
          index_pattern: 'traces-apm-*',
          time_field: '@timestamp',
        },
      ],
      timeRange: { from: 'now-15m', to: 'now' },
      searchQuery: { language: 'kuery', query: 'service.name: checkout' },
      filters: [{ meta: {}, query: { term: { 'host.name': 'web-1' } } }],
      logger: { debug: jest.fn() } as never,
    });

    const searchRequest = esClient.search.mock.calls[0][0];
    expect(searchRequest.index).toBe('traces-apm-*');
    const serializedQuery = JSON.stringify(searchRequest.query);
    expect(serializedQuery).toContain('@timestamp');
    expect(serializedQuery).toContain('checkout');
    expect(serializedQuery).toContain('web-1');
    // Prefer semantic fields over id / calendar fields on any index mapping.
    expect(Object.keys(searchRequest.aggs)).toEqual(
      expect.arrayContaining(['terms_service.name', 'stats_event.duration'])
    );
    expect(Object.keys(searchRequest.aggs)[0]).toBe('terms_service.name');
    expect(result[0]).toEqual(
      expect.objectContaining({
        index_pattern: 'traces-apm-*',
        title: 'APM traces',
        time_field: '@timestamp',
        doc_count: 42,
        top_terms: expect.objectContaining({
          'service.name': [{ key: 'checkout', doc_count: 20 }],
        }),
        numeric_stats: expect.objectContaining({
          'event.duration': { avg: 12.5, min: 0, max: 90 },
        }),
      })
    );
  });
});
