/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMillisecondsInUnit, parseInterval, toMilliseconds } from './duration_utils';

describe('downsampling/shared/duration_utils', () => {
  describe('toMilliseconds()', () => {
    it('returns -1 for empty values', () => {
      expect(toMilliseconds('', 'd')).toBe(-1);
      expect(toMilliseconds('   ', 'h')).toBe(-1);
    });

    it('returns NaN for non-numeric values', () => {
      expect(Number.isNaN(toMilliseconds('abc', 'd'))).toBe(true);
      expect(Number.isNaN(toMilliseconds('1d', 'd'))).toBe(true);
      expect(Number.isNaN(toMilliseconds('1.5', 'h'))).toBe(true);
    });

    it('converts numeric values using the unit multiplier', () => {
      expect(toMilliseconds('1', 's')).toBe(1000);
      expect(toMilliseconds('2', 'm')).toBe(120_000);
      expect(toMilliseconds('3', 'h')).toBe(10_800_000);
      expect(toMilliseconds('4', 'd')).toBe(345_600_000);
      expect(toMilliseconds('1', 'ms')).toBe(1);
      expect(toMilliseconds('1000', 'micros')).toBe(1);
      expect(toMilliseconds('1000000', 'nanos')).toBe(1);
    });
  });

  describe('parseInterval()', () => {
    it('parses value + unit from a duration string', () => {
      expect(parseInterval('20d')).toEqual({ value: '20', unit: 'd' });
      expect(parseInterval('30m')).toEqual({ value: '30', unit: 'm' });
      expect(parseInterval('5s')).toEqual({ value: '5', unit: 's' });
      expect(parseInterval('0ms')).toEqual({ value: '0', unit: 'ms' });
      expect(parseInterval('1500ms')).toEqual({ value: '1500', unit: 'ms' });
      expect(parseInterval('500micros')).toEqual({ value: '500', unit: 'micros' });
      expect(parseInterval('500000nanos')).toEqual({ value: '500000', unit: 'nanos' });
      expect(parseInterval('5w')).toBeUndefined();
    });

    it('returns undefined for missing or invalid durations', () => {
      expect(parseInterval(undefined)).toBeUndefined();
      expect(parseInterval('')).toBeUndefined();
      expect(parseInterval('d')).toBeUndefined();
      expect(parseInterval('h')).toBeUndefined();
      expect(parseInterval('1')).toBeUndefined();
      expect(parseInterval('1.2.3d')).toBeUndefined();
      expect(parseInterval(' 1d')).toBeUndefined();
      expect(parseInterval('1d ')).toBeUndefined();
      expect(parseInterval('1.5h')).toBeUndefined();
    });
  });

  describe('formatMillisecondsInUnit()', () => {
    it('formats integer values without decimals', () => {
      expect(formatMillisecondsInUnit(30 * 86_400_000, 'd')).toBe('30d');
      expect(formatMillisecondsInUnit(2 * 3_600_000, 'h')).toBe('2h');
    });

    it('formats fractional values with up to 2 decimals by default', () => {
      expect(formatMillisecondsInUnit(0.5 * 86_400_000, 'd')).toBe('0.5d');
      expect(formatMillisecondsInUnit(1.234 * 3_600_000, 'h')).toBe('1.23h');
      expect(formatMillisecondsInUnit(90_000, 'm')).toBe('1.5m');
    });

    it('allows overriding precision', () => {
      expect(formatMillisecondsInUnit(1.234 * 3_600_000, 'h', 3)).toBe('1.234h');
      expect(formatMillisecondsInUnit(106_617_600, 'd', 3)).toBe('1.234d');
    });
  });
});
