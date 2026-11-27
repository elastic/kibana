/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  type ScheduleDraft,
  validateSchedule,
  type Weekday,
  WEEKDAYS,
} from './scheduled_trigger_model';

export const getWeekdayName = (day: Weekday): string => {
  switch (day) {
    case 'MO':
      return i18n.translate('workflows.scheduledTrigger.day.monday', { defaultMessage: 'Monday' });
    case 'TU':
      return i18n.translate('workflows.scheduledTrigger.day.tuesday', {
        defaultMessage: 'Tuesday',
      });
    case 'WE':
      return i18n.translate('workflows.scheduledTrigger.day.wednesday', {
        defaultMessage: 'Wednesday',
      });
    case 'TH':
      return i18n.translate('workflows.scheduledTrigger.day.thursday', {
        defaultMessage: 'Thursday',
      });
    case 'FR':
      return i18n.translate('workflows.scheduledTrigger.day.friday', { defaultMessage: 'Friday' });
    case 'SA':
      return i18n.translate('workflows.scheduledTrigger.day.saturday', {
        defaultMessage: 'Saturday',
      });
    case 'SU':
      return i18n.translate('workflows.scheduledTrigger.day.sunday', { defaultMessage: 'Sunday' });
  }
};

const WEEKDAYS_ONLY: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR'];

const sameDays = (days: readonly Weekday[], expected: readonly Weekday[]): boolean =>
  days.length === expected.length && expected.every((day) => days.includes(day));

const joinList = (items: readonly string[]): string =>
  new Intl.ListFormat(i18n.getLocale(), { style: 'long', type: 'conjunction' }).format(items);

const ordinalDay = (day: number): string =>
  i18n.translate('workflows.scheduledTrigger.summary.ordinalDay', {
    defaultMessage: 'the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
    values: { day },
  });

const describeInterval = (intervalText: string): string => {
  const match = /^(\d+)([smhd])$/.exec(intervalText.trim());
  if (!match) return '';
  const count = Number(match[1]);
  switch (match[2]) {
    case 's':
      return i18n.translate('workflows.scheduledTrigger.summary.everySeconds', {
        defaultMessage: 'Runs every {count, plural, one {second} other {# seconds}}.',
        values: { count },
      });
    case 'm':
      return i18n.translate('workflows.scheduledTrigger.summary.everyMinutes', {
        defaultMessage: 'Runs every {count, plural, one {minute} other {# minutes}}.',
        values: { count },
      });
    case 'h':
      return i18n.translate('workflows.scheduledTrigger.summary.everyHours', {
        defaultMessage: 'Runs every {count, plural, one {hour} other {# hours}}.',
        values: { count },
      });
    default:
      return i18n.translate('workflows.scheduledTrigger.summary.everyDays', {
        defaultMessage: 'Runs every {count, plural, one {day} other {# days}}.',
        values: { count },
      });
  }
};

/** The schedule in a sentence, or an empty text while the draft has errors. */
export const describeSchedule = (draft: ScheduleDraft): string => {
  if (Object.keys(validateSchedule(draft)).length > 0) return '';
  if (draft.mode === 'interval') return describeInterval(draft.intervalText);

  const count = Number(draft.count);
  const at = i18n.translate('workflows.scheduledTrigger.summary.at', {
    defaultMessage: 'at {time} {timezone}',
    values: { time: draft.time, timezone: draft.tzid },
  });

  if (draft.repeat === 'daily') {
    const everyDay = draft.dailyDays.length === WEEKDAYS.length;
    const weekdays = sameDays(draft.dailyDays, WEEKDAYS_ONLY);
    const days = joinList(
      WEEKDAYS.filter((day) => draft.dailyDays.includes(day)).map(getWeekdayName)
    );
    if (count === 1) {
      return i18n.translate('workflows.scheduledTrigger.summary.daily', {
        defaultMessage: 'Every {which, select, all {day} weekdays {weekday} other {{days}}} {at}.',
        values: { which: everyDay ? 'all' : weekdays ? 'weekdays' : 'other', days, at },
      });
    }
    return i18n.translate('workflows.scheduledTrigger.summary.dailyEvery', {
      defaultMessage:
        'Every {count} days{which, select, all {} weekdays {, on weekdays,} other {, on {days},}} {at}.',
      values: { count, which: everyDay ? 'all' : weekdays ? 'weekdays' : 'other', days, at },
    });
  }

  if (draft.repeat === 'weekly') {
    const everyDay = draft.weeklyDays.length === WEEKDAYS.length;
    const weekdays = sameDays(draft.weeklyDays, WEEKDAYS_ONLY);
    const days = joinList(
      WEEKDAYS.filter((day) => draft.weeklyDays.includes(day)).map(getWeekdayName)
    );
    return i18n.translate('workflows.scheduledTrigger.summary.weekly', {
      defaultMessage:
        'Every {count, plural, one {week} other {# weeks}} on {which, select, all {every day} weekdays {weekdays} other {{days}}} {at}.',
      values: { count, which: everyDay ? 'all' : weekdays ? 'weekdays' : 'other', days, at },
    });
  }

  const days = joinList([...draft.monthDays].sort((a, b) => a - b).map((day) => ordinalDay(day)));
  return i18n.translate('workflows.scheduledTrigger.summary.monthly', {
    defaultMessage: 'Every {count, plural, one {month} other {# months}} on {days} {at}.',
    values: { count, days, at },
  });
};
