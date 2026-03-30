/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ALERTS_PER_EXECUTION } from '../common';
import { buildStatsEsqlSearchRequest } from './build_stats_esql_search_request';

describe('buildStatsEsqlSearchRequest', () => {
  const baseArgs = {
    query:
      'FROM logs | STATS errors = COUNT(*) BY bucket = BUCKET(@timestamp, 5 minutes) | WHERE errors > 10',
    timestampField: '@timestamp',
    from: '2024-01-01T10:00:00.000Z',
    to: '2024-01-01T10:10:00.000Z',
  };

  it('appends LIMIT to the query', () => {
    const result = buildStatsEsqlSearchRequest(baseArgs);
    expect(result.query).toContain(`| LIMIT ${MAX_ALERTS_PER_EXECUTION}`);
  });

  it('includes a range filter on the timestamp field', () => {
    const result = buildStatsEsqlSearchRequest(baseArgs);
    expect(result.filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: '2024-01-01T10:00:00.000Z',
                lte: '2024-01-01T10:10:00.000Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    });
  });

  it('does not include must_not clause', () => {
    const result = buildStatsEsqlSearchRequest(baseArgs);
    expect(result.filter).not.toHaveProperty('bool.must_not');
  });

  it('uses the provided from/to values directly (pre-aligned by caller)', () => {
    const aligned = buildStatsEsqlSearchRequest({
      ...baseArgs,
      from: '2024-01-01T09:55:00.000Z',
      to: '2024-01-01T10:05:00.000Z',
    });
    const range = (aligned.filter as any).bool.filter[0].range['@timestamp'];
    expect(range.gte).toBe('2024-01-01T09:55:00.000Z');
    expect(range.lte).toBe('2024-01-01T10:05:00.000Z');
  });
});
