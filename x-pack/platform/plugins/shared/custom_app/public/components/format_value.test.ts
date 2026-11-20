/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue, toSortValue } from './format_value';

describe('formatValue', () => {
  it('formats numbers with separators and leaves other values as text', () => {
    expect(formatValue(1234567, 'number')).toBe('1,234,567');
    expect(formatValue('n/a', 'number')).toBe('n/a');
    expect(formatValue(1234567)).toBe('1234567');
  });

  it('formats dates from ISO strings and epoch milliseconds, and leaves unparseable ones as text', () => {
    const iso = formatValue('2026-10-12T08:30:00.000Z', 'date');
    expect(iso).toMatch(/2026/);
    expect(formatValue(Date.parse('2026-10-12T08:30:00.000Z'), 'date')).toBe(iso);
    expect(formatValue('not a date', 'date')).toBe('not a date');
  });

  it('shows empty values as nothing', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(undefined, 'number')).toBe('');
  });

  it('joins multi-values and stringifies objects', () => {
    expect(formatValue(['a', 'b'])).toBe('a, b');
    expect(formatValue([1000, 2000], 'number')).toBe('1,000, 2,000');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });

  it('shows booleans as text', () => {
    expect(formatValue(true)).toBe('true');
  });
});

describe('toSortValue', () => {
  it('sorts numbers and dates by magnitude', () => {
    expect(toSortValue(10, 'number')).toBe(10);
    expect(toSortValue('10', 'number')).toBeUndefined();
    expect(toSortValue('2026-10-12T00:00:00.000Z', 'date')).toBe(
      Date.parse('2026-10-12T00:00:00.000Z')
    );
    expect(toSortValue('nope', 'date')).toBeUndefined();
  });

  it('sorts text as text, and empty values as nothing', () => {
    expect(toSortValue(5, 'text')).toBe('5');
    expect(toSortValue(null, 'text')).toBeUndefined();
  });
});
