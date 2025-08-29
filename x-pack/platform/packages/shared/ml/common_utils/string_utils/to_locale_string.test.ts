/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toLocaleString } from './to_locale_string';

describe('toLocaleString', () => {
  test('should return correct comma placement for large numbers', () => {
    expect(toLocaleString(1)).toBe('1');
    expect(toLocaleString(10)).toBe('10');
    expect(toLocaleString(100)).toBe('100');
    expect(toLocaleString(1000)).toBe('1,000');
    expect(toLocaleString(10000)).toBe('10,000');
    expect(toLocaleString(100000)).toBe('100,000');
    expect(toLocaleString(1000000)).toBe('1,000,000');
    expect(toLocaleString(10000000)).toBe('10,000,000');
    expect(toLocaleString(100000000)).toBe('100,000,000');
    expect(toLocaleString(1000000000)).toBe('1,000,000,000');
  });
  test('should return empty string for undefined or null', () => {
    expect(toLocaleString(undefined)).toBe('');
    expect(toLocaleString(null)).toBe('');
  });
});
