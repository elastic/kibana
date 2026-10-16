/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSchema, formatValue } from './format';

describe('formatValue', () => {
  it.each([
    [1234.567, undefined, '1,234.57'],
    [1234.567, { style: 'number', precision: 0 }, '1,235'],
    [0.5, { style: 'number', precision: 2 }, '0.50'],
    [1_240_000, { style: 'number', compact: true }, '1.24M'],
    [42, { style: 'number', unit: 'req/s' }, '42 req/s'],
    [42, { style: 'number', unit: '%' }, '42%'],
    [0.256, { style: 'percent' }, '25.6%'],
    [0.256, { style: 'percent', precision: 0 }, '26%'],
    [1234.5, { style: 'currency', currency: 'USD' }, '$1,234.50'],
    [1_500_000, { style: 'currency', currency: 'EUR', compact: true }, '€1.5M'],
    [512, { style: 'bytes' }, '512 B'],
    [1536, { style: 'bytes' }, '1.5 KB'],
    [3 * 1024 ** 3, { style: 'bytes' }, '3 GB'],
    [320, { style: 'duration' }, '320 ms'],
    [1500, { style: 'duration' }, '1.5 s'],
    [90, { style: 'duration', durationUnit: 's' }, '1.5 min'],
    [7_200_000, { style: 'duration' }, '2 h'],
    [-1536, { style: 'bytes' }, '-1.5 KB'],
    [67, { style: 'number', prefix: '$' }, '$67'],
    [-67.5, { style: 'number', prefix: '$' }, '-$67.5'],
    [42, { style: 'number', unit: 'ms', suffix: ' avg' }, '42 ms avg'],
    [0.25, { style: 'percent', prefix: '+' }, '+25%'],
  ] as const)('%s with %j prints %s', (value, format, expected) => {
    expect(formatValue(value, formatSchema().parse(format ?? { style: 'number' }))).toBe(expected);
  });

  it('prints a missing value as the theme glyph', () => {
    expect(formatValue(null, undefined)).toBe('—');
  });
});

describe('formatSchema', () => {
  const accepts = (format: unknown) => formatSchema().safeParse(format).success;

  it('takes a currency exactly when the style is currency', () => {
    expect(accepts({ style: 'currency', currency: 'USD' })).toBe(true);
    expect(accepts({ style: 'currency' })).toBe(false);
    expect(accepts({ style: 'number', currency: 'USD' })).toBe(false);
  });

  it('takes a unit only on a number', () => {
    expect(accepts({ style: 'number', unit: 'ms' })).toBe(true);
    expect(accepts({ style: 'percent', unit: 'ms' })).toBe(false);
  });

  it('takes a duration unit only on a duration', () => {
    expect(accepts({ style: 'duration', durationUnit: 's' })).toBe(true);
    expect(accepts({ style: 'number', durationUnit: 's' })).toBe(false);
  });

  it('takes a prefix or suffix on any style but currency', () => {
    expect(accepts({ style: 'number', prefix: '$' })).toBe(true);
    expect(accepts({ style: 'bytes', suffix: '/s' })).toBe(true);
    expect(accepts({ style: 'currency', currency: 'USD', prefix: '$' })).toBe(false);
    expect(accepts({ style: 'currency', currency: 'USD', suffix: '!' })).toBe(false);
  });

  it('bounds precision at 0 and 20', () => {
    expect(accepts({ style: 'number', precision: 0 })).toBe(true);
    expect(accepts({ style: 'number', precision: 20 })).toBe(true);
    expect(accepts({ style: 'number', precision: -1 })).toBe(false);
    expect(accepts({ style: 'number', precision: 21 })).toBe(false);
  });

  it('takes an ISO 4217 code only', () => {
    expect(accepts({ style: 'currency', currency: 'usd' })).toBe(false);
  });
});
