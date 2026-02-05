/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeSizeAndUnitLabel, toMillis } from './format_size_units';

describe('format_size_units', () => {
  describe('getTimeSizeAndUnitLabel', () => {
    describe('Valid time units', () => {
      it('should format days correctly', () => {
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 day');
        expect(getTimeSizeAndUnitLabel('30d')).toBe('30 days');
        expect(getTimeSizeAndUnitLabel('365d')).toBe('365 days');
      });

      it('should format hours correctly', () => {
        expect(getTimeSizeAndUnitLabel('1h')).toBe('1 hour');
        expect(getTimeSizeAndUnitLabel('24h')).toBe('24 hours');
        expect(getTimeSizeAndUnitLabel('72h')).toBe('72 hours');
      });

      it('should format minutes correctly', () => {
        expect(getTimeSizeAndUnitLabel('1m')).toBe('1 minute');
        expect(getTimeSizeAndUnitLabel('15m')).toBe('15 minutes');
        expect(getTimeSizeAndUnitLabel('60m')).toBe('60 minutes');
      });

      it('should format seconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1s')).toBe('1 second');
        expect(getTimeSizeAndUnitLabel('60s')).toBe('60 seconds');
        expect(getTimeSizeAndUnitLabel('3600s')).toBe('3600 seconds');
      });

      it('should format milliseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1ms')).toBe('1 millisecond');
        expect(getTimeSizeAndUnitLabel('500ms')).toBe('500 milliseconds');
        expect(getTimeSizeAndUnitLabel('1000ms')).toBe('1000 milliseconds');
      });

      it('should format microseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1micros')).toBe('1 microsecond');
        expect(getTimeSizeAndUnitLabel('500micros')).toBe('500 microseconds');
        expect(getTimeSizeAndUnitLabel('1000micros')).toBe('1000 microseconds');
      });

      it('should format nanoseconds correctly', () => {
        expect(getTimeSizeAndUnitLabel('1nanos')).toBe('1 nanosecond');
        expect(getTimeSizeAndUnitLabel('500nanos')).toBe('500 nanoseconds');
        expect(getTimeSizeAndUnitLabel('1000nanos')).toBe('1000 nanoseconds');
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(getTimeSizeAndUnitLabel(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(getTimeSizeAndUnitLabel('')).toBeUndefined();
      });

      it('should handle zero values', () => {
        expect(getTimeSizeAndUnitLabel('0d')).toBe('0 days');
        expect(getTimeSizeAndUnitLabel('0h')).toBe('0 hours');
        expect(getTimeSizeAndUnitLabel('0m')).toBe('0 minutes');
        expect(getTimeSizeAndUnitLabel('0s')).toBe('0 seconds');
      });

      it('should handle large numbers', () => {
        expect(getTimeSizeAndUnitLabel('999999d')).toBe('999999 days');
        expect(getTimeSizeAndUnitLabel('1000000h')).toBe('1000000 hours');
      });

      it('should return original value for unrecognized units', () => {
        expect(getTimeSizeAndUnitLabel('30x')).toBe('30x');
        expect(getTimeSizeAndUnitLabel('invalid')).toBe('invalid');
      });

      it('should return original value for malformed input', () => {
        expect(getTimeSizeAndUnitLabel('d30')).toBe('d30');
        expect(getTimeSizeAndUnitLabel('abc123d')).toBe('abc123d');
        expect(getTimeSizeAndUnitLabel('30')).toBe('30');
      });
    });

    describe('Input variations', () => {
      it('should handle different numeric formats', () => {
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 day');
        expect(getTimeSizeAndUnitLabel('01d')).toBe('01 day');
        expect(getTimeSizeAndUnitLabel('100d')).toBe('100 days');
      });

      it('should be case sensitive for units', () => {
        // Only lowercase units should be recognized
        expect(getTimeSizeAndUnitLabel('30D')).toBe('30D'); // Should return original
        expect(getTimeSizeAndUnitLabel('30H')).toBe('30H'); // Should return original
        expect(getTimeSizeAndUnitLabel('30M')).toBe('30M'); // Should return original
        expect(getTimeSizeAndUnitLabel('30S')).toBe('30S'); // Should return original
      });
    });

    describe('Retention policy examples', () => {
      it('should handle common retention periods', () => {
        // Common data retention periods
        expect(getTimeSizeAndUnitLabel('7d')).toBe('7 days');
        expect(getTimeSizeAndUnitLabel('30d')).toBe('30 days');
        expect(getTimeSizeAndUnitLabel('90d')).toBe('90 days');
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 day');
        expect(getTimeSizeAndUnitLabel('2h')).toBe('2 hours');
      });

      it('should handle ILM policy time formats', () => {
        // Time formats commonly used in ILM policies
        expect(getTimeSizeAndUnitLabel('15m')).toBe('15 minutes');
        expect(getTimeSizeAndUnitLabel('12h')).toBe('12 hours');
        expect(getTimeSizeAndUnitLabel('1d')).toBe('1 day');
        expect(getTimeSizeAndUnitLabel('365d')).toBe('365 days');
      });
    });
  });

  describe('toMillis', () => {
    describe('Valid time units', () => {
      it('should convert days to milliseconds', () => {
        expect(toMillis('1d')).toBe(86400000); // 1 day = 24 * 60 * 60 * 1000
        expect(toMillis('7d')).toBe(604800000); // 7 days
        expect(toMillis('30d')).toBe(2592000000); // 30 days
      });

      it('should convert hours to milliseconds', () => {
        expect(toMillis('1h')).toBe(3600000); // 1 hour = 60 * 60 * 1000
        expect(toMillis('24h')).toBe(86400000); // 24 hours = 1 day
        expect(toMillis('12h')).toBe(43200000);
      });

      it('should convert minutes to milliseconds', () => {
        expect(toMillis('1m')).toBe(60000); // 1 minute = 60 * 1000
        expect(toMillis('60m')).toBe(3600000); // 60 minutes = 1 hour
        expect(toMillis('15m')).toBe(900000);
      });

      it('should convert seconds to milliseconds', () => {
        expect(toMillis('1s')).toBe(1000);
        expect(toMillis('60s')).toBe(60000); // 60 seconds = 1 minute
        expect(toMillis('30s')).toBe(30000);
      });

      it('should convert milliseconds to milliseconds', () => {
        expect(toMillis('1ms')).toBe(1);
        expect(toMillis('500ms')).toBe(500);
        expect(toMillis('1000ms')).toBe(1000);
      });

      it('should convert microseconds to milliseconds', () => {
        expect(toMillis('1000micros')).toBe(1); // 1000 microseconds = 1 ms
        expect(toMillis('500micros')).toBe(0.5);
      });

      it('should convert nanoseconds to milliseconds', () => {
        expect(toMillis('1000000nanos')).toBe(1); // 1,000,000 nanoseconds = 1 ms
        expect(toMillis('500000nanos')).toBe(0.5);
      });
    });

    describe('Edge cases', () => {
      it('should return undefined for undefined input', () => {
        expect(toMillis(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string', () => {
        expect(toMillis('')).toBeUndefined();
      });

      it('should handle zero values', () => {
        expect(toMillis('0d')).toBe(0);
        expect(toMillis('0h')).toBe(0);
        expect(toMillis('0m')).toBe(0);
        expect(toMillis('0s')).toBe(0);
        expect(toMillis('0ms')).toBe(0);
      });

      it('should return undefined for unrecognized units', () => {
        expect(toMillis('30x')).toBeUndefined();
        expect(toMillis('invalid')).toBeUndefined();
      });

      it('should return undefined for malformed input', () => {
        expect(toMillis('d30')).toBeUndefined();
        expect(toMillis('abc123d')).toBeUndefined();
        expect(toMillis('30')).toBeUndefined();
      });
    });
  });
});
