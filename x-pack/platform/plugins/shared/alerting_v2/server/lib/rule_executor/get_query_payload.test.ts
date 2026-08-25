/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryPayload } from './get_query_payload';

describe('getQueryPayload', () => {
  const now = Date.parse('2025-01-01T00:00:00.000Z');

  it('builds filter and omits params when query does not use _tstart/_tend', () => {
    const payload = getQueryPayload({
      query: 'FROM idx | LIMIT 10',
      timeField: '@timestamp',
      lookbackWindow: '5m',
      now,
    });

    expect(payload.dateEnd).toBe('2025-01-01T00:00:00.000Z');
    expect(payload.dateStart).toBe('2024-12-31T23:55:00.000Z');
    expect(payload.params).toBeUndefined();
    expect(payload.filter).toEqual({
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                lte: '2025-01-01T00:00:00.000Z',
                gt: '2024-12-31T23:55:00.000Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    });
  });

  it('includes only _tstart when query uses ?_tstart', () => {
    const payload = getQueryPayload({
      query: 'FROM idx | WHERE @timestamp >= ?_tstart',
      timeField: '@timestamp',
      lookbackWindow: '5m',
      now,
    });

    expect(payload.params).toEqual([{ _tstart: '2024-12-31T23:55:00.000Z' }]);
  });

  it('includes only _tend when query uses ?_tend', () => {
    const payload = getQueryPayload({
      query: 'FROM idx | WHERE @timestamp < ?_tend',
      timeField: '@timestamp',
      lookbackWindow: '5m',
      now,
    });

    expect(payload.params).toEqual([{ _tend: '2025-01-01T00:00:00.000Z' }]);
  });

  it('includes both _tstart and _tend when query uses both params', () => {
    const payload = getQueryPayload({
      query: 'FROM idx | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
      timeField: '@timestamp',
      lookbackWindow: '5m',
      now,
    });

    expect(payload.params).toEqual([
      { _tstart: '2024-12-31T23:55:00.000Z' },
      { _tend: '2025-01-01T00:00:00.000Z' },
    ]);
  });
});
