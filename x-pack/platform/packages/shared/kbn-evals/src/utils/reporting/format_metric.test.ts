/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMetricValue } from './format_metric';

describe('formatMetricValue', () => {
  it.each([
    [0.8, '0.80'],
    [-0.1, '-0.10'],
    [0.01, '0.01'],
    [12.345, '12.35'],
    [0, '0.00'],
  ])('keeps two decimals for %p', (value, expected) => {
    expect(formatMetricValue(value)).toBe(expected);
  });

  it.each([
    [0.004, '0.0040'],
    [0.002, '0.0020'],
    [-0.0023, '-0.0023'],
    [0.0099, '0.0099'],
    [0.00004, '0.000040'],
  ])('keeps two significant digits for sub-cent %p', (value, expected) => {
    expect(formatMetricValue(value)).toBe(expected);
  });

  it('treats float noise below the precision floor as zero', () => {
    expect(formatMetricValue(0.1 + 0.2 - 0.3)).toBe('0.00');
    expect(formatMetricValue(1e-9)).toBe('0.00');
  });
});
