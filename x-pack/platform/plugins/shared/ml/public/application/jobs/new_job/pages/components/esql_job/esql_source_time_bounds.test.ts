/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildSourceTimeBoundsQuery,
  getEsqlQuerySource,
  parseSourceTimeBounds,
} from './esql_source_time_bounds';

describe('getEsqlQuerySource', () => {
  it.each([
    ['FROM logs-* | STATS c = COUNT(*)', 'logs-*'],
    ['from a, b-* METADATA _index | LIMIT 1', 'a, b-*'],
    ['  // c\n FROM logs-*\n| KEEP host', 'logs-*'],
    ['TS metrics-* | STATS AVG(x)', 'metrics-*'],
    ['FROM logs-*', 'logs-*'],
  ])('extracts the source of %j', (query, source) => {
    expect(getEsqlQuerySource(query)).toBe(source);
  });

  it('returns undefined for a query without a FROM/TS command', () => {
    expect(getEsqlQuerySource('ROW a = 1')).toBeUndefined();
    expect(getEsqlQuerySource('')).toBeUndefined();
  });
});

describe('buildSourceTimeBoundsQuery', () => {
  it('queries MIN/MAX of the raw source time field over the source only', () => {
    expect(
      buildSourceTimeBoundsQuery('FROM logs-* | WHERE x > 1 | STATS c = COUNT(*)', '@timestamp')
    ).toBe(
      'FROM logs-* | STATS esql_source_earliest = MIN(@timestamp), esql_source_latest = MAX(@timestamp)'
    );
  });

  it('backtick-quotes field names that are not plain identifiers', () => {
    expect(buildSourceTimeBoundsQuery('FROM a', 'event time')).toContain('MIN(`event time`)');
  });

  it('returns undefined when the source or field is missing', () => {
    expect(buildSourceTimeBoundsQuery('ROW a = 1', '@timestamp')).toBeUndefined();
    expect(buildSourceTimeBoundsQuery('FROM a', '  ')).toBeUndefined();
  });
});

describe('parseSourceTimeBounds', () => {
  const columns = [{ name: 'esql_source_earliest' }, { name: 'esql_source_latest' }];

  it('normalizes the returned timestamps to ISO strings', () => {
    expect(
      parseSourceTimeBounds({
        columns,
        values: [['2026-01-01T00:00:00.000Z', '2026-02-01T12:30:00.123456789Z']],
      })
    ).toEqual({ earliest: '2026-01-01T00:00:00.000Z', latest: '2026-02-01T12:30:00.123Z' });
  });

  it('returns undefined for an empty source (null MIN/MAX) or a malformed response', () => {
    expect(parseSourceTimeBounds({ columns, values: [[null, null]] })).toBeUndefined();
    expect(parseSourceTimeBounds({ columns, values: [] })).toBeUndefined();
    expect(parseSourceTimeBounds({ columns: [], values: [['x']] })).toBeUndefined();
    expect(parseSourceTimeBounds({ columns, values: [['nope', 'nope']] })).toBeUndefined();
  });
});
