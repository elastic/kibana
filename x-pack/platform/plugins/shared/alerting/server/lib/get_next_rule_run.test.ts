/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { RuleSchedule } from '../../common';
import { getNextRuleRun } from './get_next_rule_run';

const startDate = new Date('2026-01-01T00:00:00.000Z');

describe('getNextRuleRun', () => {
  describe('interval schedules', () => {
    it('adds the interval to the start date', () => {
      expect(getNextRuleRun({ startDate, schedule: { interval: '5m' } })).toBe(
        '2026-01-01T00:05:00.000Z'
      );
    });

    it('supports hour and day intervals', () => {
      expect(getNextRuleRun({ startDate, schedule: { interval: '2h' } })).toBe(
        '2026-01-01T02:00:00.000Z'
      );
      expect(getNextRuleRun({ startDate, schedule: { interval: '1d' } })).toBe(
        '2026-01-02T00:00:00.000Z'
      );
    });

    it('defaults to now when no start date is given', () => {
      jest.useFakeTimers().setSystemTime(startDate);
      expect(getNextRuleRun({ schedule: { interval: '1m' } })).toBe('2026-01-01T00:01:00.000Z');
      jest.useRealTimers();
    });
  });

  describe('rrule schedules', () => {
    it('returns the next daily occurrence', () => {
      const schedule: RuleSchedule = {
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
          dtstart: '2026-01-01T00:00:00.000Z',
          byhour: [9],
          byminute: [30],
        },
      };

      expect(getNextRuleRun({ startDate, schedule })).toBe('2026-01-01T09:30:00.000Z');
    });

    it('returns the next hourly occurrence', () => {
      const schedule: RuleSchedule = {
        rrule: {
          freq: Frequency.HOURLY,
          interval: 1,
          tzid: 'UTC',
          dtstart: '2026-01-01T00:00:00.000Z',
          byminute: [15],
        },
      };

      expect(getNextRuleRun({ startDate, schedule })).toBe('2026-01-01T00:15:00.000Z');
    });

    it('pins the occurrence to the start of the minute when there is no dtstart', () => {
      const schedule: RuleSchedule = {
        rrule: { freq: Frequency.HOURLY, interval: 1, tzid: 'UTC', byminute: [15] },
      };

      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:30.500Z'));
      // Seconds come from bysecond: [0], milliseconds are inherited from dtstart, matching how
      // Task Manager computes the first run for an rrule task.
      expect(getNextRuleRun({ schedule })).toBe('2026-01-01T00:15:00.500Z');
      jest.useRealTimers();
    });

    it('skips occurrences at or before the start date', () => {
      const schedule: RuleSchedule = {
        rrule: {
          freq: Frequency.DAILY,
          interval: 1,
          tzid: 'UTC',
          dtstart: '2026-01-01T00:00:00.000Z',
          byhour: [0],
          byminute: [0],
        },
      };

      expect(getNextRuleRun({ startDate, schedule })).toBe('2026-01-02T00:00:00.000Z');
    });
  });

  describe('invalid schedules', () => {
    it('throws when the schedule has neither interval nor rrule', () => {
      expect(() =>
        getNextRuleRun({ startDate, schedule: {} as RuleSchedule })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Schedule is neither an interval nor an rrule, unable to calculate next run"`
      );
    });
  });
});
