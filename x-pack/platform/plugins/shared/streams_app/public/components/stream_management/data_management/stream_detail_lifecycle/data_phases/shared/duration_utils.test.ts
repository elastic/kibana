/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatDuration,
  getDoubledDurationFromPrevious,
  getMultipleStepAttributes,
  parseInterval,
  parseIntervalWithDefaultUnit,
  stepFromMultipleMs,
  toMilliseconds,
} from './duration_utils';

describe('downsampling/shared/duration_utils', () => {
  describe('toMilliseconds()', () => {
    it('returns -1 for empty values', () => {
      expect(toMilliseconds('', 'd')).toBe(-1);
      expect(toMilliseconds('   ', 'h')).toBe(-1);
    });

    it('returns -1 for invalid values', () => {
      expect(toMilliseconds('abc', 'd')).toBe(-1);
      expect(toMilliseconds('1d', 'd')).toBe(-1);
    });

    it('converts numeric values using the unit multiplier', () => {
      expect(toMilliseconds('1', 's')).toBe(1000);
      expect(toMilliseconds('2', 'm')).toBe(120_000);
      expect(toMilliseconds('3', 'h')).toBe(10_800_000);
      expect(toMilliseconds('4', 'd')).toBe(345_600_000);
      expect(toMilliseconds('1.5', 'h')).toBe(5_400_000);
      expect(toMilliseconds('1', 'ms')).toBe(1);
      expect(toMilliseconds('1000', 'micros')).toBe(1);
      expect(toMilliseconds('1000000', 'nanos')).toBe(1);
    });

    it('supports negative values', () => {
      expect(toMilliseconds('-1', 'd')).toBe(-86_400_000);
      expect(toMilliseconds('-2', 'h')).toBe(-7_200_000);
    });
  });

  describe('parseInterval()', () => {
    it('parses value + unit from a duration string', () => {
      expect(parseInterval('20d')).toEqual({ value: '20', unit: 'd' });
      expect(parseInterval('30m')).toEqual({ value: '30', unit: 'm' });
      expect(parseInterval('5s')).toEqual({ value: '5', unit: 's' });
      expect(parseInterval('1.5h')).toEqual({ value: '1.5', unit: 'h' });
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
    });
  });

  describe('parseIntervalWithDefaultUnit()', () => {
    it('parses valid duration strings', () => {
      expect(parseIntervalWithDefaultUnit('20d')).toEqual({ value: '20', unit: 'd' });
      expect(parseIntervalWithDefaultUnit('1500ms')).toEqual({ value: '1500', unit: 'ms' });
    });

    it('uses an empty value and default unit for missing or invalid durations', () => {
      expect(parseIntervalWithDefaultUnit(undefined)).toEqual({ value: '', unit: 'd' });
      expect(parseIntervalWithDefaultUnit('invalid', 'h')).toEqual({ value: '', unit: 'h' });
    });
  });

  describe('formatDuration()', () => {
    it('formats a numeric value and unit', () => {
      expect(formatDuration('20', 'd')).toBe('20d');
      expect(formatDuration('1.5', 'h')).toBe('1.5h');
    });

    it('returns undefined when value or unit is missing', () => {
      expect(formatDuration('', 'd')).toBeUndefined();
      expect(formatDuration('20', undefined)).toBeUndefined();
    });

    it('rejects non-finite values by default (no NaNd / Infinityd leaks)', () => {
      expect(formatDuration('NaN', 'd')).toBeUndefined();
      expect(formatDuration('abc', 'd')).toBeUndefined();
      expect(formatDuration('Infinity', 'd')).toBeUndefined();
      // 0 stays valid, and negatives are only rejected when a minimum is set (lenient previews rely
      // on keeping a negative value).
      expect(formatDuration('0', 'd')).toBe('0d');
      expect(formatDuration('-1', 'd')).toBe('-1d');
      expect(formatDuration('-1', 'd', { minInclusive: 0 })).toBeUndefined();
    });

    it('supports integer and minimum constraints', () => {
      expect(formatDuration('0', 's', { integerOnly: true, minInclusive: 0 })).toBe('0s');
      expect(formatDuration('-1', 's', { integerOnly: true, minInclusive: 0 })).toBeUndefined();
      expect(formatDuration('1.5', 's', { integerOnly: true })).toBeUndefined();
      expect(formatDuration('0', 's', { integerOnly: true, minExclusive: 0 })).toBeUndefined();
    });
  });

  describe('getDoubledDurationFromPrevious()', () => {
    it('doubles the previous value and preserves the unit', () => {
      expect(
        getDoubledDurationFromPrevious({
          previousValue: '30',
          previousUnit: 'd',
          previousValueFallback: 30,
          previousValueMinInclusive: 0,
        })
      ).toEqual({ value: '60', unit: 'd', ms: 60 * 86_400_000 });
    });

    it('uses fallback when previous value is invalid', () => {
      expect(
        getDoubledDurationFromPrevious({
          previousValue: 'abc',
          previousUnit: 'h',
          previousValueFallback: 1,
          previousValueMinInclusive: 0,
        })
      ).toEqual({ value: '2', unit: 'h', ms: 2 * 3_600_000 });
    });

    it('uses fallback when previous value violates minimum constraints', () => {
      expect(
        getDoubledDurationFromPrevious({
          previousValue: '-5',
          previousUnit: 'm',
          previousValueFallback: 0,
          previousValueMinInclusive: 0,
        })
      ).toEqual({ value: '0', unit: 'm', ms: 0 });

      expect(
        getDoubledDurationFromPrevious({
          previousValue: '0',
          previousUnit: 'd',
          previousValueFallback: 1,
          previousValueMinExclusive: 0,
        })
      ).toEqual({ value: '2', unit: 'd', ms: 2 * 86_400_000 });
    });

    it('allows overriding the multiplier', () => {
      expect(
        getDoubledDurationFromPrevious({
          previousValue: '10',
          previousUnit: 's',
          multiplier: 3,
          previousValueFallback: 10,
          previousValueMinInclusive: 0,
        })
      ).toEqual({ value: '30', unit: 's', ms: 30_000 });
    });
  });

  describe('stepFromMultipleMs()', () => {
    const DAY_MS = 86_400_000;

    it('defaults to 1 when there is no multiple constraint', () => {
      expect(stepFromMultipleMs(0, 'd')).toBe(1);
      expect(stepFromMultipleMs(-5, 'd')).toBe(1);
      expect(stepFromMultipleMs(NaN, 'd')).toBe(1);
    });

    it('expresses the multiple in the current unit', () => {
      // A 2d multiple steps by 2 when the unit is days, and by 48 when the unit is hours.
      expect(stepFromMultipleMs(2 * DAY_MS, 'd')).toBe(2);
      expect(stepFromMultipleMs(2 * DAY_MS, 'h')).toBe(48);
      expect(stepFromMultipleMs(DAY_MS, 'd')).toBe(1);
    });

    it('supports fractional steps when the multiple is not a whole number of units', () => {
      // 12h expressed in days is 0.5.
      expect(stepFromMultipleMs(12 * 60 * 60 * 1000, 'd')).toBe(0.5);
    });
  });

  describe('getMultipleStepAttributes()', () => {
    const DAY_MS = 86_400_000;

    it('uses the base min and steps by 1 when there is no multiple constraint', () => {
      expect(
        getMultipleStepAttributes({ currentValue: '8', unit: 'd', multipleOfMs: 0, baseMin: 1 })
      ).toEqual({ min: 1, step: 1 });
      expect(
        getMultipleStepAttributes({ currentValue: '8', unit: 'd', multipleOfMs: 0, baseMin: 0 })
      ).toEqual({ min: 0, step: 1 });
    });

    it('anchors min and steps by the multiple when the value is already a valid multiple', () => {
      // 8d is a multiple of the 4d previous interval -> step (and min) become 4 so 8d -> 12d.
      expect(
        getMultipleStepAttributes({
          currentValue: '8',
          unit: 'd',
          multipleOfMs: 4 * DAY_MS,
          baseMin: 1,
        })
      ).toEqual({ min: 4, step: 4 });
      // A value equal to the multiple is still aligned.
      expect(
        getMultipleStepAttributes({
          currentValue: '4',
          unit: 'd',
          multipleOfMs: 4 * DAY_MS,
          baseMin: 1,
        })
      ).toEqual({ min: 4, step: 4 });
    });

    it('falls back to stepping by 1 from the base min when the value is off-grid', () => {
      // 9d is not a multiple of 4d -> allow nudging by 1 (9d -> 10d) instead of snapping.
      expect(
        getMultipleStepAttributes({
          currentValue: '9',
          unit: 'd',
          multipleOfMs: 4 * DAY_MS,
          baseMin: 1,
        })
      ).toEqual({ min: 1, step: 1 });
    });

    it('treats empty or invalid values as off-grid', () => {
      expect(
        getMultipleStepAttributes({
          currentValue: '',
          unit: 'd',
          multipleOfMs: 4 * DAY_MS,
          baseMin: 1,
        })
      ).toEqual({ min: 1, step: 1 });
    });

    it('expresses the anchored step in the current unit', () => {
      // 48h is a multiple of the 2d previous interval -> step by 48 hours.
      expect(
        getMultipleStepAttributes({
          currentValue: '48',
          unit: 'h',
          multipleOfMs: 2 * DAY_MS,
          baseMin: 1,
        })
      ).toEqual({ min: 48, step: 48 });
    });

    it('steps by 1 when the multiple is not a whole number of the current unit', () => {
      // A 12h previous interval shown while this field is in days would step by 0.5 -> use 1 instead.
      expect(
        getMultipleStepAttributes({
          currentValue: '1',
          unit: 'd',
          multipleOfMs: 12 * 60 * 60 * 1000,
          baseMin: 1,
        })
      ).toEqual({ min: 1, step: 1 });
    });
  });
});
