/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { isCalendarInterval, leastCommonInterval } from './interval_helper';

describe('interval_helper', () => {
  describe('isCalendarInterval', () => {
    describe('calendar intervals', () => {
      test('should return true for "w" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'w' })).toBeTruthy());

      test('should return true for "M" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'M' })).toBeTruthy());

      test('should return true for "y" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'y' })).toBeTruthy());

      test('should return false for "w" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 2, unit: 'w' })).toBeFalsy());

      test('should return false for "M" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 3, unit: 'M' })).toBeFalsy());

      test('should return false for "y" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 4, unit: 'y' })).toBeFalsy());

    });

    describe('fixed intervals', () => {
      test('should return false for "ms" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 2, unit: 'ms' })).toBeFalsy());

      test('should return false for "s" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 3, unit: 's' })).toBeFalsy());

      test('should return false for "s" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 's' })).toBeFalsy());
    });

    describe('mixed intervals', () => {
      test('should return true for "m" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'm' })).toBeTruthy());

      test('should return true for "h" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'h' })).toBeTruthy());

      test('should return true for "d" intervals and value === 1', () =>
        expect(isCalendarInterval({ value: 1, unit: 'd' })).toBeTruthy());

      test('should return false for "m" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 2, unit: 'm' })).toBeFalsy());

      test('should return false for "h" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 3, unit: 'h' })).toBeFalsy());

      test('should return false for "d" intervals and value !== 1', () =>
        expect(isCalendarInterval({ value: 4, unit: 'd' })).toBeFalsy());

    });
  });
});

describe('leastCommonInterval', () => {
  test('should return 1 as a least common interval for 0,1', () =>
    expect(leastCommonInterval(0, 1)).toBe(1));

  test('should return 3 as a least common interval for 1,3', () =>
    expect(leastCommonInterval(1, 3)).toBe(3));

  test('should return 15 as a least common interval for 12,5', () =>
    expect(leastCommonInterval(12, 5)).toBe(15));

  test('should return 7 as a least common interval for 4,7', () =>
    expect(leastCommonInterval(4, 7)).toBe(7));

  test('should not return least common interval (negative tests)', () =>
    expect(leastCommonInterval(0, 0)).toBeNaN());
});
