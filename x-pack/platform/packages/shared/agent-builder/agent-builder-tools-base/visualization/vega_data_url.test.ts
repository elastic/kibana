/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlDataUrl } from './vega_data_url';

describe('buildEsqlDataUrl', () => {
  it('builds a Kibana ES|QL data url with context applied', () => {
    expect(buildEsqlDataUrl({ query: 'FROM logs | STATS count = COUNT(*) BY host' })).toEqual({
      '%type%': 'esql',
      '%context%': true,
      query: 'FROM logs | STATS count = COUNT(*) BY host',
    });
  });

  it('omits %timefield% when the query does not reference the time picker', () => {
    const url = buildEsqlDataUrl({
      query: 'FROM logs | STATS count = COUNT(*) BY host',
      columns: [{ name: '@timestamp', type: 'date' }],
    });

    expect(url['%timefield%']).toBeUndefined();
  });

  it('sets %timefield% to a date result column when the query is time-picker aware', () => {
    const url = buildEsqlDataUrl({
      query:
        'FROM logs | STATS count = COUNT(*) BY bucket = BUCKET(event_time, 75, ?_tstart, ?_tend)',
      columns: [
        { name: 'count', type: 'long' },
        { name: 'event_time', type: 'date' },
      ],
    });

    expect(url['%timefield%']).toBe('event_time');
  });

  it('falls back to @timestamp when time params are used but no date column is present', () => {
    const url = buildEsqlDataUrl({
      query:
        'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS c = COUNT(*)',
      columns: [{ name: 'c', type: 'long' }],
    });

    expect(url['%timefield%']).toBe('@timestamp');
  });
});
