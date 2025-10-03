/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeSizeAndUnitLabel } from './format_size_units';

describe('format_size_units', () => {
  describe('getTimeSizeAndUnitLabel', () => {
    describe('Valid Time Units', () => {
      it('formats days correctly', () => {
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 days');
        expect(getTimeSizeAndUnitLabel('7d')).toBe('7 days');
        expect(getTimeSizeAndUnitLabel('30d')).toBe('30 days');
        expect(getTimeSizeAndUnitLabel('365d')).toBe('365 days');
      });

      it('formats hours correctly', () => {
        expect(getTimeSizeAndUnitLabel('1h')).toBe('1 hours');
        expect(getTimeSizeAndUnitLabel('24h')).toBe('24 hours');
        expect(getTimeSizeAndUnitLabel('72h')).toBe('72 hours');
      });

      it('formats minutes correctly', () => {
        expect(getTimeSizeAndUnitLabel('1m')).toBe('1 minutes');
        expect(getTimeSizeAndUnitLabel('30m')).toBe('30 minutes');
        expect(getTimeSizeAndUnitLabel('60m')).toBe('60 minutes');
      });

      it('formats seconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1s')).toBe('1 seconds');
        expect(getTimeSizeAndUnitLabel('30s')).toBe('30 seconds');
        expect(getTimeSizeAndUnitLabel('3600s')).toBe('3600 seconds');
      });

      it('formats milliseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1ms')).toBe('1 milliseconds');
        expect(getTimeSizeAndUnitLabel('100ms')).toBe('100 milliseconds');
        expect(getTimeSizeAndUnitLabel('1000ms')).toBe('1000 milliseconds');
      });

      it('formats microseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1micros')).toBe('1 microseconds');
        expect(getTimeSizeAndUnitLabel('1000micros')).toBe('1000 microseconds');
      });

      it('formats nanoseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1nanos')).toBe('1 nanoseconds');
        expect(getTimeSizeAndUnitLabel('1000nanos')).toBe('1000 nanoseconds');
      });
    });

    describe('Edge Cases', () => {
      it('returns undefined for undefined input', () => {
        expect(getTimeSizeAndUnitLabel(undefined)).toBeUndefined();
      });

      it('returns undefined for null input', () => {
        expect(getTimeSizeAndUnitLabel(null as any)).toBeUndefined();
      });

      it('returns undefined for empty string', () => {
        expect(getTimeSizeAndUnitLabel('')).toBeUndefined();
      });

      it('handles zero values correctly', () => {
        expect(getTimeSizeAndUnitLabel('0d')).toBe('0 days');
        expect(getTimeSizeAndUnitLabel('0h')).toBe('0 hours');
        expect(getTimeSizeAndUnitLabel('0m')).toBe('0 minutes');
        expect(getTimeSizeAndUnitLabel('0s')).toBe('0 seconds');
      });
    });

    describe('Invalid or Unknown Units', () => {
      it('falls back to original value for unknown units', () => {
        expect(getTimeSizeAndUnitLabel('1w')).toBe('1w'); // week is not in the mapping
        expect(getTimeSizeAndUnitLabel('1y')).toBe('1y'); // year is not in the mapping
        expect(getTimeSizeAndUnitLabel('1xyz')).toBe('1xyz'); // completely invalid unit
      });

      it('handles numbers without units', () => {
        expect(getTimeSizeAndUnitLabel('123')).toBe('123'); // no unit detected
        expect(getTimeSizeAndUnitLabel('0')).toBe('0');
      });

      it('handles invalid formats gracefully', () => {
        expect(getTimeSizeAndUnitLabel('abc')).toBe('abc'); // no numbers
        expect(getTimeSizeAndUnitLabel('d1')).toBe('d1'); // unit before number
        expect(getTimeSizeAndUnitLabel('1 d')).toBe('1 d'); // space between number and unit
      });
    });

    describe('Large Numbers', () => {
      it('handles large numeric values', () => {
        expect(getTimeSizeAndUnitLabel('999999d')).toBe('999999 days');
        expect(getTimeSizeAndUnitLabel('1000000h')).toBe('1000000 hours');
        expect(getTimeSizeAndUnitLabel('123456789ms')).toBe('123456789 milliseconds');
      });
    });

    describe('Decimal Numbers', () => {
      it('handles decimal values in the number part', () => {
        // Note: The regex /(\\d+)(\\w+)/ only captures integers, so decimals might not work as expected
        // But we should test the current behavior
        expect(getTimeSizeAndUnitLabel('1.5d')).toBe('1.5d'); // Falls back to original since regex doesn't match decimals
        expect(getTimeSizeAndUnitLabel('2.5h')).toBe('2.5h');
      });
    });

    describe('Multiple Digit Numbers', () => {
      it('correctly parses multi-digit numbers', () => {
        expect(getTimeSizeAndUnitLabel('10d')).toBe('10 days');
        expect(getTimeSizeAndUnitLabel('100h')).toBe('100 hours');
        expect(getTimeSizeAndUnitLabel('1000m')).toBe('1000 minutes');
        expect(getTimeSizeAndUnitLabel('10000s')).toBe('10000 seconds');
      });
    });

    describe('Case Sensitivity', () => {
      it('is case sensitive for units', () => {
        expect(getTimeSizeAndUnitLabel('1D')).toBe('1D'); // uppercase D is not recognized
        expect(getTimeSizeAndUnitLabel('1H')).toBe('1H'); // uppercase H is not recognized
        expect(getTimeSizeAndUnitLabel('1M')).toBe('1M'); // uppercase M is not recognized
        expect(getTimeSizeAndUnitLabel('1S')).toBe('1S'); // uppercase S is not recognized
      });
    });

    describe('Real-World Elasticsearch Duration Examples', () => {
      it('handles common Elasticsearch ILM durations', () => {
        expect(getTimeSizeAndUnitLabel('30d')).toBe('30 days'); // Common ILM delete phase
        expect(getTimeSizeAndUnitLabel('7d')).toBe('7 days');   // Common warm phase transition
        expect(getTimeSizeAndUnitLabel('1h')).toBe('1 hours');  // Quick transition to warm
        expect(getTimeSizeAndUnitLabel('90d')).toBe('90 days'); // Long retention period
      });

      it('handles common data stream lifecycle durations', () => {
        expect(getTimeSizeAndUnitLabel('15d')).toBe('15 days'); // Common DSL retention
        expect(getTimeSizeAndUnitLabel('60d')).toBe('60 days'); // Extended retention
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 days');   // Short retention for testing
      });
    });

    describe('Integration with i18n Labels', () => {
      it('uses correct i18n labels for each unit type', () => {
        // These tests verify that the function uses the i18n translation keys
        // The actual translated text would depend on the locale, but we test the structure
        const dayResult = getTimeSizeAndUnitLabel('1d');
        expect(dayResult).toContain('days');

        const hourResult = getTimeSizeAndUnitLabel('1h');
        expect(hourResult).toContain('hours');

        const minuteResult = getTimeSizeAndUnitLabel('1m');
        expect(minuteResult).toContain('minutes');

        const secondResult = getTimeSizeAndUnitLabel('1s');
        expect(secondResult).toContain('seconds');

        const msResult = getTimeSizeAndUnitLabel('1ms');
        expect(msResult).toContain('milliseconds');

        const microsResult = getTimeSizeAndUnitLabel('1micros');
        expect(microsResult).toContain('microseconds');

        const nanosResult = getTimeSizeAndUnitLabel('1nanos');
        expect(nanosResult).toContain('nanoseconds');
      });
    });
  });
});