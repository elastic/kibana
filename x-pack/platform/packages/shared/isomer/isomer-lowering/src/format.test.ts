/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from './esql_response';

describe('formatValue', () => {
  it.each([
    [0.051, { kind: 'percent', precision: 2 }, '5.10%'],
    [0.2513, { kind: 'percent', precision: 1 }, '25.1%'],
    [3_480_000, { kind: 'bytes', precision: 2 }, '3.32 MB'],
    [512, { kind: 'bytes' }, '512 B'],
    [1234.5678, { kind: 'number', precision: 1 }, '1,234.6'],
    [13014, { kind: 'number', compact: true }, '13.01K'],
    [42, { kind: 'number', prefix: '$', precision: 2 }, '$42.00'],
    [12, { kind: 'custom', template: '{value} req/s', precision: 0 }, '12 req/s'],
    [1234.5678, undefined, 1234.57],
  ] as const)('formats %s with %j as %s', (value, format, expected) => {
    expect(formatValue(value, format)).toBe(expected);
  });
});
