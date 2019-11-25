/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { abbreviateWholeNumber } from './abbreviate_whole_number';

describe('ML - abbreviateWholeNumber formatter', () => {
  test('returns the correct format using default max digits', () => {
    expect(abbreviateWholeNumber(1)).toBe(1);
    expect(abbreviateWholeNumber(12)).toBe(12);
    expect(abbreviateWholeNumber(123)).toBe(123);
    expect(abbreviateWholeNumber(1234)).toBe('1k');
    expect(abbreviateWholeNumber(12345)).toBe('12k');
    expect(abbreviateWholeNumber(123456)).toBe('123k');
    expect(abbreviateWholeNumber(1234567)).toBe('1m');
    expect(abbreviateWholeNumber(12345678)).toBe('12m');
    expect(abbreviateWholeNumber(123456789)).toBe('123m');
    expect(abbreviateWholeNumber(1234567890)).toBe('1b');
    expect(abbreviateWholeNumber(5555555555555.55)).toBe('6t');
  });

  test('returns the correct format using custom max digits', () => {
    expect(abbreviateWholeNumber(1, 4)).toBe(1);
    expect(abbreviateWholeNumber(12, 4)).toBe(12);
    expect(abbreviateWholeNumber(123, 4)).toBe(123);
    expect(abbreviateWholeNumber(1234, 4)).toBe(1234);
    expect(abbreviateWholeNumber(12345, 4)).toBe('12k');
    expect(abbreviateWholeNumber(123456, 6)).toBe(123456);
    expect(abbreviateWholeNumber(1234567, 4)).toBe('1m');
    expect(abbreviateWholeNumber(12345678, 3)).toBe('12m');
    expect(abbreviateWholeNumber(123456789, 9)).toBe(123456789);
    expect(abbreviateWholeNumber(1234567890, 3)).toBe('1b');
    expect(abbreviateWholeNumber(5555555555555.55, 5)).toBe('6t');
  });
});
