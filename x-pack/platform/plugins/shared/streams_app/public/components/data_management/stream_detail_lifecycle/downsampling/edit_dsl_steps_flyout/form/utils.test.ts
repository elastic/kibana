/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatMillisecondsInUnit,
  getStepIndexFromArrayItemPath,
  parseInterval,
  toMilliseconds,
} from './utils';

describe('streams DSL steps flyout utils', () => {
  describe('parseInterval()', () => {
    it('parses a simple duration', () => {
      expect(parseInterval('30d')).toEqual({ value: '30', unit: 'd' });
      expect(parseInterval('5h')).toEqual({ value: '5', unit: 'h' });
      expect(parseInterval('10m')).toEqual({ value: '10', unit: 'm' });
      expect(parseInterval('1s')).toEqual({ value: '1', unit: 's' });
    });

    it('returns undefined for invalid inputs', () => {
      expect(parseInterval(undefined)).toBeUndefined();
      expect(parseInterval('')).toBeUndefined();
      expect(parseInterval('1ms')).toBeUndefined();
      expect(parseInterval('h')).toBeUndefined();
      expect(parseInterval('1')).toBeUndefined();
      expect(parseInterval('1w')).toBeUndefined();
      expect(parseInterval(' 1d')).toBeUndefined();
      expect(parseInterval('1d ')).toBeUndefined();
      expect(parseInterval('1.5h')).toBeUndefined();
    });

    it('normalizes whole-second millisecond durations to seconds', () => {
      expect(parseInterval('0ms')).toEqual({ value: '0', unit: 's' });
      expect(parseInterval('1000ms')).toEqual({ value: '1', unit: 's' });
      expect(parseInterval('5000ms')).toEqual({ value: '5', unit: 's' });
      expect(parseInterval('1500ms')).toBeUndefined();
    });
  });

  describe('toMilliseconds()', () => {
    it('converts common units', () => {
      expect(toMilliseconds('1', 's')).toBe(1000);
      expect(toMilliseconds('2', 'm')).toBe(2 * 60_000);
      expect(toMilliseconds('3', 'h')).toBe(3 * 3_600_000);
      expect(toMilliseconds('4', 'd')).toBe(4 * 86_400_000);
    });

    it('returns -1 for empty/blank strings', () => {
      expect(toMilliseconds('', 'd')).toBe(-1);
      expect(toMilliseconds('   ', 'd')).toBe(-1);
    });

    it('returns NaN for non-numeric values', () => {
      expect(Number.isNaN(toMilliseconds('abc', 'd'))).toBe(true);
    });
  });

  describe('formatMillisecondsInUnit()', () => {
    it('keeps integer values as integers', () => {
      expect(formatMillisecondsInUnit(2 * 86_400_000, 'd')).toBe('2d');
      expect(formatMillisecondsInUnit(60_000, 'm')).toBe('1m');
    });

    it('formats fractional values with default precision', () => {
      expect(formatMillisecondsInUnit(90_000, 'm')).toBe('1.5m');
    });

    it('rounds to the provided precision', () => {
      // 1.234d should round to 1.23d with default precision 2
      expect(formatMillisecondsInUnit(106_617_600, 'd')).toBe('1.23d');
      // and keep more precision when requested
      expect(formatMillisecondsInUnit(106_617_600, 'd', 3)).toBe('1.234d');
    });
  });

  describe('getStepIndexFromArrayItemPath()', () => {
    it('extracts a step index from an ArrayItem path', () => {
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[0]')).toBe(0);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[12]')).toBe(12);
    });

    it('returns -1 for non-step paths', () => {
      expect(getStepIndexFromArrayItemPath('')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('foo')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[1].afterValue')).toBe(-1);
      expect(getStepIndexFromArrayItemPath('_meta.downsampleSteps[]')).toBe(-1);
    });
  });
});
