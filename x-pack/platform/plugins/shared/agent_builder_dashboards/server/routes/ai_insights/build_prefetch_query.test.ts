/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPrefetchQuery } from './build_prefetch_query';

describe('buildPrefetchQuery', () => {
  it('combines time range with KQL and filters for any dashboard', () => {
    const query = buildPrefetchQuery({
      timeField: '@timestamp',
      timeRange: { from: 'now-1h', to: 'now' },
      searchQuery: { language: 'kuery', query: 'service.name: checkout' },
      filters: [
        {
          meta: { disabled: false },
          query: { term: { 'host.name': 'web-1' } },
        },
      ],
    });

    const serialized = JSON.stringify(query);
    expect(serialized).toContain('@timestamp');
    expect(serialized).toContain('now-1h');
    expect(serialized).toContain('checkout');
    expect(serialized).toContain('web-1');
  });

  it('falls back to time-only when there is no search bar query', () => {
    expect(
      buildPrefetchQuery({
        timeField: 'timestamp',
        timeRange: { from: 'now-15m', to: 'now' },
      })
    ).toEqual({
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: 'now-15m',
                lte: 'now',
              },
            },
          },
        ],
        must: [],
        should: [],
        must_not: [],
      },
    });
  });
});
