/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration, parseDurationInSeconds } from './parse_duration';

describe('parseDuration', () => {
  it('should parse valid durations correctly', () => {
    expect(parseDuration('30d')).toEqual({ value: 30, unit: 'd' });
    expect(parseDuration('24h')).toEqual({ value: 24, unit: 'h' });
    expect(parseDuration('60m')).toEqual({ value: 60, unit: 'm' });
    expect(parseDuration('60s')).toEqual({ value: 60, unit: 's' });
  });

  it('should handle single digit durations', () => {
    expect(parseDuration('1d')).toEqual({ value: 1, unit: 'd' });
    expect(parseDuration('5h')).toEqual({ value: 5, unit: 'h' });
    expect(parseDuration('9m')).toEqual({ value: 9, unit: 'm' });
    expect(parseDuration('3s')).toEqual({ value: 3, unit: 's' });
  });

  it('should handle large numbers', () => {
    expect(parseDuration('365d')).toEqual({ value: 365, unit: 'd' });
    expect(parseDuration('8760h')).toEqual({ value: 8760, unit: 'h' });
  });

  it('should return undefined for invalid formats', () => {
    expect(parseDuration('invalid')).toBeUndefined();
    expect(parseDuration('30x')).toBeUndefined();
    expect(parseDuration('d30')).toBeUndefined();
    expect(parseDuration('30')).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
  });

  it('should return undefined for undefined/empty input', () => {
    expect(parseDuration()).toBeUndefined();
    expect(parseDuration('')).toBeUndefined();
  });

  it('should handle zero values', () => {
    expect(parseDuration('0d')).toEqual({ value: 0, unit: 'd' });
    expect(parseDuration('0h')).toEqual({ value: 0, unit: 'h' });
  });
});

describe('parseDurationInSeconds', () => {
  describe('Valid conversions', () => {
    it('should convert seconds correctly', () => {
      expect(parseDurationInSeconds('60s')).toBe(60);
      expect(parseDurationInSeconds('1s')).toBe(1);
      expect(parseDurationInSeconds('0s')).toBe(0);
    });

    it('should convert minutes to seconds', () => {
      expect(parseDurationInSeconds('1m')).toBe(60);
      expect(parseDurationInSeconds('5m')).toBe(300);
      expect(parseDurationInSeconds('60m')).toBe(3600);
    });

    it('should convert hours to seconds', () => {
      expect(parseDurationInSeconds('1h')).toBe(3600);
      expect(parseDurationInSeconds('2h')).toBe(7200);
      expect(parseDurationInSeconds('24h')).toBe(86400);
    });

    it('should convert days to seconds', () => {
      expect(parseDurationInSeconds('1d')).toBe(86400);
      expect(parseDurationInSeconds('7d')).toBe(604800);
      expect(parseDurationInSeconds('30d')).toBe(2592000);
    });
  });

  describe('Edge cases', () => {
    it('should return 0 for invalid durations', () => {
      expect(parseDurationInSeconds('invalid')).toBe(0);
      expect(parseDurationInSeconds('30x')).toBe(0);
      expect(parseDurationInSeconds('')).toBe(0);
      expect(parseDurationInSeconds()).toBe(0);
    });

    it('should handle zero values', () => {
      expect(parseDurationInSeconds('0d')).toBe(0);
      expect(parseDurationInSeconds('0h')).toBe(0);
      expect(parseDurationInSeconds('0m')).toBe(0);
      expect(parseDurationInSeconds('0s')).toBe(0);
    });
  });
});
