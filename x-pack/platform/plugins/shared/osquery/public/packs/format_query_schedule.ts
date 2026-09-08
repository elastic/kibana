/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Frequency, Weekday, type WeekdayStr } from '@kbn/rrule';
import type { RRuleScheduleConfig, ScheduleType } from '../../common/schedule';
import { parseRRule } from '../../common/utils/rrule_parser';

/**
 * Effective schedule resolved per query row — either the query's own override
 * or the inherited pack schedule.
 */
export interface EffectiveSchedule {
  schedule_type?: ScheduleType;
  interval?: number;
  rrule_schedule?: RRuleScheduleConfig;
}

/**
 * Short weekday labels keyed by `@kbn/rrule` {@link WeekdayStr} token. These
 * mirror the labels used by the frequency selector so the table and the form
 * stay in sync.
 */
const WEEKDAY_SHORT_LABEL: Record<WeekdayStr, string> = {
  SU: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.su', {
    defaultMessage: 'Sun',
  }),
  MO: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.mo', {
    defaultMessage: 'Mon',
  }),
  TU: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.tu', {
    defaultMessage: 'Tue',
  }),
  WE: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.we', {
    defaultMessage: 'Wed',
  }),
  TH: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.th', {
    defaultMessage: 'Thu',
  }),
  FR: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.fr', {
    defaultMessage: 'Fri',
  }),
  SA: i18n.translate('xpack.osquery.pack.queriesTable.scheduleWeekday.sa', {
    defaultMessage: 'Sat',
  }),
};

/**
 * Display order for weekdays in the Schedule column — Sunday-first to match the
 * pack form layout.
 */
const WEEKDAY_DISPLAY_ORDER: readonly WeekdayStr[] = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * `@kbn/rrule` {@link Weekday} enum member → {@link WeekdayStr} token. Local to
 * this module so the display path does not widen `schedule_serializer`'s API.
 */
const WEEKDAY_TO_TOKEN: Record<Weekday, WeekdayStr> = {
  [Weekday.MO]: 'MO',
  [Weekday.TU]: 'TU',
  [Weekday.WE]: 'WE',
  [Weekday.TH]: 'TH',
  [Weekday.FR]: 'FR',
  [Weekday.SA]: 'SA',
  [Weekday.SU]: 'SU',
};

const formatInterval = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleIntervalText', {
    defaultMessage: '{n}s',
    values: { n: interval },
  });

const DAILY_TEXT = i18n.translate('xpack.osquery.pack.queriesTable.scheduleDailyText', {
  defaultMessage: 'Daily',
});

const HOURLY_TEXT = i18n.translate('xpack.osquery.pack.queriesTable.scheduleHourlyText', {
  defaultMessage: 'Hourly',
});

const MINUTELY_TEXT = i18n.translate('xpack.osquery.pack.queriesTable.scheduleMinutelyText', {
  defaultMessage: 'Every minute',
});

/**
 * `Every N <unit>` for each frequency that has no day-of-week qualifier. Each
 * unit gets its own ICU message so translators can inflect the unit noun
 * independently — a single shared message with a substituted unit string does
 * not survive translation into languages with grammatical case.
 */
const formatEveryNDays = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleEveryNDaysText', {
    defaultMessage: 'Every {interval, plural, one {day} other {# days}}',
    values: { interval },
  });

const formatEveryNHours = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleEveryNHoursText', {
    defaultMessage: 'Every {interval, plural, one {hour} other {# hours}}',
    values: { interval },
  });

const formatEveryNMinutes = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleEveryNMinutesText', {
    defaultMessage: 'Every {interval, plural, one {minute} other {# minutes}}',
    values: { interval },
  });

const formatEveryNMonths = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleEveryNMonthsText', {
    defaultMessage: 'Every {interval, plural, one {month} other {# months}}',
    values: { interval },
  });

const formatEveryNYears = (interval: number): string =>
  i18n.translate('xpack.osquery.pack.queriesTable.scheduleEveryNYearsText', {
    defaultMessage: 'Every {interval, plural, one {year} other {# years}}',
    values: { interval },
  });

const formatWeekly = (interval: number, weekdays: string[]): string => {
  if (weekdays.length === 0) {
    return i18n.translate('xpack.osquery.pack.queriesTable.scheduleCustomNoDaysText', {
      defaultMessage: 'Every {interval, plural, one {week} other {# weeks}}',
      values: { interval },
    });
  }

  return i18n.translate('xpack.osquery.pack.queriesTable.scheduleCustomText', {
    defaultMessage: 'Every {interval, plural, one {week} other {# weeks}} on {weekdays}',
    values: { interval, weekdays: weekdays.join(', ') },
  });
};

/**
 * Format a query's effective schedule into human-readable text for the pack
 * queries table Schedule column.
 *
 * - interval mode → `"{n}s"` (e.g. `3600s`)
 * - `FREQ=DAILY` → `"Daily"`, or `"Every N days"` when `INTERVAL > 1`
 * - `FREQ=WEEKLY` → `"Every N week(s) on {weekdays}"` (or without the day list
 *   when the rule carries no `BYDAY`)
 * - `FREQ=MONTHLY` / `YEARLY` → `"Every N month(s)"` / `"Every N year(s)"`
 * - `FREQ=HOURLY` / `MINUTELY` → `"Hourly"` / `"Every minute"`, or
 *   `"Every N hours/minutes"` when `INTERVAL > 1`
 *
 * Falls back to interval text when the schedule is interval mode, the rrule
 * string is missing, or it cannot be parsed.
 *
 * This reads the **parsed RRULE fields** rather than the form-facing recurrence
 * projection (`rruleFieldsToRecurrence`). That projection is lossy on purpose —
 * it folds frequencies the editor cannot render onto an editable `'daily'`
 * default and stashes the real rule in `_unknown`. Displaying from it made the
 * table assert falsehoods: `FREQ=HOURLY` read as "Daily" and `FREQ=MONTHLY`
 * read as "Every week", because the projection's `repeatUnit` was ignored.
 */
export const formatQuerySchedule = (schedule: EffectiveSchedule): string => {
  if (schedule.schedule_type === 'rrule' && schedule.rrule_schedule?.rrule) {
    try {
      const fields = parseRRule(schedule.rrule_schedule.rrule);
      // An absent or non-positive INTERVAL means 1 per RFC 5545.
      const interval = fields.interval && fields.interval > 0 ? fields.interval : 1;

      switch (fields.freq) {
        case Frequency.MINUTELY:
          return interval === 1 ? MINUTELY_TEXT : formatEveryNMinutes(interval);

        case Frequency.HOURLY:
          return interval === 1 ? HOURLY_TEXT : formatEveryNHours(interval);

        case Frequency.DAILY:
          return interval === 1 ? DAILY_TEXT : formatEveryNDays(interval);

        case Frequency.WEEKLY: {
          const selected = (fields.byweekday ?? [])
            .map((day) => WEEKDAY_TO_TOKEN[day])
            .filter((token): token is WeekdayStr => token !== undefined);
          const weekdays = WEEKDAY_DISPLAY_ORDER.filter((token) => selected.includes(token)).map(
            (token) => WEEKDAY_SHORT_LABEL[token]
          );

          return formatWeekly(interval, weekdays);
        }

        case Frequency.MONTHLY:
          return formatEveryNMonths(interval);

        case Frequency.YEARLY:
          return formatEveryNYears(interval);

        default:
          // An unrecognized frequency (e.g. SECONDLY) has no honest label —
          // fall through to interval text rather than assert a wrong one.
          break;
      }
    } catch {
      // Fall through to interval text on an unparseable rrule string.
    }
  }

  return formatInterval(schedule.interval ?? 0);
};
