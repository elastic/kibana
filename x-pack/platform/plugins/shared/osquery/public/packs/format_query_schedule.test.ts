/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatQuerySchedule } from './format_query_schedule';

describe('formatQuerySchedule', () => {
  describe('interval mode', () => {
    it('should render "{n}s" for an interval schedule', () => {
      expect(formatQuerySchedule({ schedule_type: 'interval', interval: 3600 })).toBe('3600s');
    });

    it('should render the row interval when no schedule_type is set (legacy inherit)', () => {
      expect(formatQuerySchedule({ interval: 60 })).toBe('60s');
    });

    it('should render "0s" when no interval is available', () => {
      expect(formatQuerySchedule({})).toBe('0s');
    });
  });

  describe('rrule mode', () => {
    const startDate = '2024-01-01T00:00:00.000Z';

    it('should render "Daily" for a daily rrule', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          rrule_schedule: { rrule: 'FREQ=DAILY', start_date: startDate },
        })
      ).toBe('Daily');
    });

    it('should render "Every week on ..." for a custom weekly rrule with interval 1', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH,FR',
            start_date: startDate,
          },
        })
      ).toBe('Every week on Sun, Mon, Tue, Wed, Thu, Fri');
    });

    it('should render "Every N weeks on ..." for a custom weekly rrule with interval > 1', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU',
            start_date: startDate,
          },
        })
      ).toBe('Every 2 weeks on Tue');
    });

    // Previously asserted 'Daily' — that encoded the frequency-coverage defect.
    // A weekly rule without BYDAY still recurs weekly; the missing day list only
    // means the recurrence day is derived from the start date (RFC 5545).
    it('should render the weekly cadence when a weekly rrule omits BYDAY', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          rrule_schedule: { rrule: 'FREQ=WEEKLY;INTERVAL=3', start_date: startDate },
        })
      ).toBe('Every 3 weeks');
    });

    it('should order weekdays Sunday-first regardless of BYDAY order', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          rrule_schedule: {
            rrule: 'FREQ=WEEKLY;BYDAY=FR,MO,SU',
            start_date: startDate,
          },
        })
      ).toBe('Every week on Sun, Mon, Fri');
    });

    it('should fall back to interval text on a missing rrule string', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          interval: 120,
          // @ts-expect-error intentionally missing rrule
          rrule_schedule: { start_date: startDate },
        })
      ).toBe('120s');
    });

    it('should fall back to interval text on an invalid rrule string', () => {
      expect(
        formatQuerySchedule({
          schedule_type: 'rrule',
          interval: 90,
          rrule_schedule: { rrule: 'NOT_A_VALID_RRULE', start_date: startDate },
        })
      ).toBe('90s');
    });
  });

  // Regression coverage for the frequency-coverage defect: the formatter used
  // to display from `rruleFieldsToRecurrence`, which folds every frequency the
  // editor cannot render onto an editable 'daily' default and ignores
  // `repeatUnit`. That made the table assert falsehoods — a quarterly schedule
  // read "Every 3 weeks" and an hourly one read "Daily".
  describe('frequency coverage', () => {
    const anchorDate = '2024-01-01T00:00:00.000Z';
    const format = (rrule: string) =>
      formatQuerySchedule({
        schedule_type: 'rrule',
        interval: 3600,
        rrule_schedule: { rrule, start_date: anchorDate },
      });

    it('should render MONTHLY in months, not weeks', () => {
      expect(format('FREQ=MONTHLY')).toBe('Every month');
      expect(format('FREQ=MONTHLY;INTERVAL=3')).toBe('Every 3 months');
    });

    it('should render YEARLY in years, not weeks', () => {
      expect(format('FREQ=YEARLY')).toBe('Every year');
      expect(format('FREQ=YEARLY;INTERVAL=2')).toBe('Every 2 years');
    });

    it('should render a monthly rule with BYMONTHDAY including the day list', () => {
      expect(format('FREQ=MONTHLY;BYMONTHDAY=15')).toBe('Every month on day 15');
      expect(format('FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1,15')).toBe('Every 3 months on day 1, 15');
    });

    it('should sort BYMONTHDAY values so the day list reads in calendar order', () => {
      expect(format('FREQ=MONTHLY;BYMONTHDAY=15,1,28')).toBe('Every month on day 1, 15, 28');
    });

    // RFC 5545 permits -31..-1 for the Nth day from the end of the month.
    // "day -1" would read as a literal day number, so the bare label is the
    // only honest rendering available here.
    it('should omit the day list when BYMONTHDAY carries a negative day', () => {
      expect(format('FREQ=MONTHLY;BYMONTHDAY=-1')).toBe('Every month');
      expect(format('FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=-1')).toBe('Every 2 months');
    });

    it('should render a yearly rule with BYMONTH including the month list', () => {
      expect(format('FREQ=YEARLY;BYMONTH=3')).toBe('Every year in Mar');
      expect(format('FREQ=YEARLY;INTERVAL=2;BYMONTH=1,7')).toBe('Every 2 years in Jan, Jul');
    });

    it('should render a yearly rule with both BYMONTH and BYMONTHDAY', () => {
      expect(format('FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15')).toBe('Every year in Mar on day 15');
    });

    // A day-of-month with no BYMONTH omits which month it falls in, so the
    // bare yearly label is preferred over a partial qualifier.
    it('should omit a lone BYMONTHDAY qualifier on a yearly rule', () => {
      expect(format('FREQ=YEARLY;BYMONTHDAY=15')).toBe('Every year');
    });

    it('should render HOURLY as hourly, not daily', () => {
      expect(format('FREQ=HOURLY')).toBe('Hourly');
      expect(format('FREQ=HOURLY;INTERVAL=6')).toBe('Every 6 hours');
    });

    it('should render MINUTELY as minutes, not daily', () => {
      expect(format('FREQ=MINUTELY')).toBe('Every minute');
      expect(format('FREQ=MINUTELY;INTERVAL=20')).toBe('Every 20 minutes');
    });

    it('should honor INTERVAL on a daily rule instead of dropping it', () => {
      expect(format('FREQ=DAILY')).toBe('Daily');
      expect(format('FREQ=DAILY;INTERVAL=2')).toBe('Every 2 days');
    });

    it('should render a weekly rule with no BYDAY without a day list', () => {
      expect(format('FREQ=WEEKLY')).toBe('Every week');
      expect(format('FREQ=WEEKLY;INTERVAL=2')).toBe('Every 2 weeks');
    });

    // `parseRRule` rejects a non-positive INTERVAL outright, so the formatter
    // never sees it and falls back to interval text rather than guessing.
    it('should fall back to interval text when INTERVAL is not a positive integer', () => {
      expect(format('FREQ=MONTHLY;INTERVAL=0')).toBe('3600s');
    });
  });
});
