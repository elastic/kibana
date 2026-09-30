/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import { coerceRow, toRows } from './row_coercion';

describe('coerceRow', () => {
  it('coerces BigInt values to Number', () => {
    expect(coerceRow({ host: 'host-a', cpu: BigInt(80) })).toEqual({ host: 'host-a', cpu: 80 });
  });

  it('leaves values of other types untouched', () => {
    expect(coerceRow({ host: 'host-a', ratio: 12.75, ok: true })).toEqual({
      host: 'host-a',
      ratio: 12.75,
      ok: true,
    });
  });

  it('truncates listed date columns to integer epoch millis', () => {
    expect(coerceRow({ bucket: 1787580092123.4568 }, new Set(['bucket']))).toEqual({
      bucket: 1787580092123,
    });
  });

  it('parses ISO-8601 strings in listed date columns to epoch millis', () => {
    const iso = '2026-08-24T14:01:32.000Z';
    expect(coerceRow({ bucket: iso }, new Set(['bucket']))).toEqual({ bucket: Date.parse(iso) });
  });

  it('maps multivalue date columns element-wise', () => {
    expect(
      coerceRow({ bucket: [1787580092123.4568, 1787580095123.99] }, new Set(['bucket']))
    ).toEqual({ bucket: [1787580092123, 1787580095123] });
  });

  it('keeps an unparseable string in a date column rather than yielding NaN', () => {
    expect(coerceRow({ bucket: 'not-a-date' }, new Set(['bucket']))).toEqual({
      bucket: 'not-a-date',
    });
  });
});

describe('toRows', () => {
  const response: EsqlQueryResponse = {
    columns: [
      { name: 'bucket', type: 'date' },
      { name: 'host', type: 'keyword' },
    ],
    values: [['2026-08-24T14:01:32.000Z', 'host-a']],
  };

  it('zips columns and values into row objects', () => {
    expect(toRows(response)).toEqual([{ bucket: '2026-08-24T14:01:32.000Z', host: 'host-a' }]);
  });

  it('leaves date columns as ISO strings by default', () => {
    expect(toRows(response)[0].bucket).toBe('2026-08-24T14:01:32.000Z');
  });

  it('normalizes date and date_nanos columns to epoch millis when asked', () => {
    const withNanos: EsqlQueryResponse = {
      columns: [
        { name: 'bucket', type: 'date' },
        { name: 'precise', type: 'date_nanos' },
      ],
      values: [['2026-08-24T14:01:32.000Z', '2026-08-24T14:01:32.123456789Z']],
    };

    expect(toRows(withNanos, { normalizeDates: true })).toEqual([
      { bucket: 1787580092000, precise: 1787580092123 },
    ]);
  });

  it('returns an empty array when the response has no values', () => {
    expect(toRows({ columns: [{ name: 'host', type: 'keyword' }], values: [] })).toEqual([]);
  });
});
