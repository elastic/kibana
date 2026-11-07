/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMPTY_VALUE,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatRelativeTime,
  formatSchedule,
  getFailureRate,
  getRunCount,
} from './format';

describe('format', () => {
  describe('formatDuration', () => {
    it.each([
      [undefined, EMPTY_VALUE],
      [0, '0 ms'],
      [999.4, '999 ms'],
      [1_500, '1.5 s'],
      [90_000, '1.5 min'],
      [5_400_000, '1.5 h'],
    ])('formats %p as %p', (ms, expected) => {
      expect(formatDuration(ms)).toBe(expected);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-02T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('formats past and future dates relative to now', () => {
      expect(formatRelativeTime('2026-11-02T11:00:00.000Z')).toBe('an hour ago');
      expect(formatRelativeTime('2026-11-02T12:05:00.000Z')).toBe('in 5 minutes');
    });

    it('returns the empty value for missing dates', () => {
      expect(formatRelativeTime(undefined)).toBe(EMPTY_VALUE);
      expect(formatRelativeTime(null)).toBe(EMPTY_VALUE);
    });
  });

  describe('formatDateTime', () => {
    it('formats dates with millisecond precision', () => {
      expect(formatDateTime('2026-11-02T11:00:00.123Z')).toMatch(
        /^Nov \d{1,2}, 2026 @ \d{2}:\d{2}:\d{2}\.123$/
      );
    });

    it('returns the empty value for missing dates', () => {
      expect(formatDateTime(null)).toBe(EMPTY_VALUE);
    });
  });

  describe('formatSchedule', () => {
    it('describes interval, rrule and one-time schedules', () => {
      expect(formatSchedule({ interval: '5m' })).toBe('Every 5m');
      expect(formatSchedule({ rrule: { freq: 3 } })).toBe('Custom schedule');
      expect(formatSchedule(undefined)).toBe('One-time');
    });
  });

  describe('run counts', () => {
    it('sums successful and failed runs', () => {
      expect(getRunCount({ success: 3, failure: 1, failed_tasks: 1 })).toBe(4);
      expect(getRunCount(undefined)).toBe(0);
    });

    it('computes the failure rate only when there are runs', () => {
      expect(getFailureRate({ success: 3, failure: 1, failed_tasks: 1 })).toBe(0.25);
      expect(getFailureRate({ success: 0, failure: 0, failed_tasks: 0 })).toBeUndefined();
      expect(getFailureRate(undefined)).toBeUndefined();
    });

    it('formats ratios as percentages', () => {
      expect(formatPercent(0.25)).toBe('25%');
      expect(formatPercent(1 / 3)).toBe('33.3%');
      expect(formatPercent(undefined)).toBe(EMPTY_VALUE);
    });
  });
});
