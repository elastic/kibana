/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatRadarIntegrityError,
  hasRadarColumns,
  validateRadarRows,
} from './radar_integrity';

describe('validateRadarRows', () => {
  const columns = [
    { name: 'key', type: 'keyword' as const },
    { name: 'value', type: 'long' as const },
  ];

  it('detects radar columns with aliases', () => {
    expect(hasRadarColumns(columns)).toBe(true);
    expect(
      hasRadarColumns([
        { name: 'category', type: 'keyword' },
        { name: 'metric', type: 'double' },
      ])
    ).toBe(true);
    expect(hasRadarColumns([{ name: 'key', type: 'keyword' }])).toBe(false);
  });

  it('passes for distinct keys with numeric values', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 1],
          ['B', 2],
          ['C', 3],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('passes when there are no rows (sample time window may be empty)', () => {
    expect(validateRadarRows({ columns, values: [] })).toEqual({ ok: true });
  });

  it('passes when there are fewer than three distinct keys (cardinality is soft guidance)', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 1],
          ['B', 2],
        ],
      })
    ).toEqual({ ok: true });
  });

  it('fails when values are non-numeric', () => {
    expect(
      validateRadarRows({
        columns,
        values: [
          ['A', 'x'],
          ['B', 2],
          ['C', 3],
        ],
      })
    ).toEqual({ ok: false, reason: 'non_numeric_values' });
  });

  it('formats radar regeneration errors', () => {
    expect(formatRadarIntegrityError({ ok: false, reason: 'missing_columns' })).toContain(
      'key/value'
    );
    expect(formatRadarIntegrityError({ ok: false, reason: 'non_numeric_values' })).toContain(
      'non-numeric'
    );
  });
});
