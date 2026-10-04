/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsqlSourceTimeRangeFilter } from './esql_source_time_range_filter';

describe('buildEsqlSourceTimeRangeFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a DSL range filter on the source time field from the resolved range', () => {
    expect(
      buildEsqlSourceTimeRangeFilter({ sourceTimeField: 'ts', from: 'now-15m', to: 'now' })
    ).toEqual({
      bool: {
        filter: [
          {
            range: {
              ts: {
                gte: '2026-09-30T11:45:00.000Z',
                lte: '2026-09-30T12:00:00.000Z',
                format: 'strict_date_optional_time',
              },
            },
          },
        ],
      },
    });
  });

  it('re-resolves relative times against the current clock on every call', () => {
    const first = buildEsqlSourceTimeRangeFilter({
      sourceTimeField: 'ts',
      from: 'now-15m',
      to: 'now',
    });

    jest.setSystemTime(new Date('2026-09-30T12:10:00.000Z'));

    const second = buildEsqlSourceTimeRangeFilter({
      sourceTimeField: 'ts',
      from: 'now-15m',
      to: 'now',
    });

    expect(first?.bool.filter[0].range.ts.lte).toBe('2026-09-30T12:00:00.000Z');
    expect(second?.bool.filter[0].range.ts.gte).toBe('2026-09-30T11:55:00.000Z');
    expect(second?.bool.filter[0].range.ts.lte).toBe('2026-09-30T12:10:00.000Z');
  });

  it('keeps absolute times as given', () => {
    const filter = buildEsqlSourceTimeRangeFilter({
      sourceTimeField: 'ts',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    });

    expect(filter?.bool.filter[0].range.ts).toMatchObject({
      gte: '2026-01-01T00:00:00.000Z',
      lte: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns no filter without a source time field', () => {
    expect(
      buildEsqlSourceTimeRangeFilter({ sourceTimeField: '  ', from: 'now-15m', to: 'now' })
    ).toBeUndefined();
  });
});
