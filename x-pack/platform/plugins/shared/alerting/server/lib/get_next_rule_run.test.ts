/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNextRuleRun } from './get_next_rule_run';

describe('getNextRuleRun', () => {
  describe('interval schedule', () => {
    test('works as expected when startDate and interval are provided', () => {
      const startDate = new Date('2025-01-15T10:00:00.000Z');
      const result = getNextRuleRun({
        startDate,
        schedule: { interval: '10m' },
      });
      expect(result).toBe('2025-01-15T10:10:00.000Z');
    });

    test('returns next run as now+interval when startDate is null', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00.000Z'));
      const result = getNextRuleRun({
        startDate: null,
        schedule: { interval: '5m' },
      });
      expect(result).toBe('2025-01-15T10:05:00.000Z');
      jest.useRealTimers();
    });
  });

  describe('rrule schedule', () => {
    test('returns next run from rrule with fixed time (same day)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-30T10:00:00.000Z'));
      const result = getNextRuleRun({
        startDate: null,
        schedule: {
          rrule: {
            dtstart: '2025-06-30T00:00:00.000Z',
            freq: 3, // Daily
            interval: 1,
            tzid: 'UTC',
            byhour: [12],
            byminute: [15],
          },
        },
      });
      expect(result).toBe(new Date('2025-06-30T12:15:00.000Z').toISOString());
      jest.useRealTimers();
    });

    test('uses startDate as dtstart when provided', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-30T08:00:00.000Z'));
      const startDate = new Date('2025-06-29T00:00:00.000Z');
      const result = getNextRuleRun({
        startDate,
        schedule: {
          rrule: {
            dtstart: '2025-06-29T00:00:00.000Z',
            freq: 3,
            interval: 1,
            tzid: 'UTC',
            byhour: [10],
            byminute: [0],
          },
        },
      });
      expect(result).toBe(new Date('2025-06-30T10:00:00.000Z').toISOString());
      jest.useRealTimers();
    });

    test('handles rrule with until', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-30T08:00:00.000Z'));
      const result = getNextRuleRun({
        startDate: null,
        schedule: {
          rrule: {
            dtstart: '2025-06-30T00:00:00.000Z',
            freq: 3,
            interval: 1,
            tzid: 'UTC',
            byhour: [12],
            byminute: [0],
          },
        },
      });
      expect(result).toBe(new Date('2025-06-30T12:00:00.000Z').toISOString());
      jest.useRealTimers();
    });
  });

  describe('invalid or empty schedule', () => {
    test('throws when schedule has neither interval nor rrule', () => {
      expect(() =>
        getNextRuleRun({
          startDate: new Date(),
          schedule: {} as Parameters<typeof getNextRuleRun>[0]['schedule'],
        })
      ).toThrow('Invalid schedule, unable to calculate next run');
    });

    test('throws when schedule is undefined', () => {
      expect(() =>
        getNextRuleRun({
          startDate: new Date(),
          schedule: undefined as unknown as Parameters<typeof getNextRuleRun>[0]['schedule'],
        })
      ).toThrow('Invalid schedule, unable to calculate next run');
    });

    test('throws when rrule has no next occurrence', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-20T12:00:00.000Z'));
      expect(() =>
        getNextRuleRun({
          startDate: null,
          schedule: {
            rrule: {
              dtstart: '2025-07-01T00:00:00.000Z',
              freq: 3,
              interval: 1,
              tzid: 'UTC',
              byhour: [12],
              byminute: [0],
            },
          },
        })
      ).toThrow('Invalid schedule, unable to calculate next run');
      jest.useRealTimers();
    });
  });
});
