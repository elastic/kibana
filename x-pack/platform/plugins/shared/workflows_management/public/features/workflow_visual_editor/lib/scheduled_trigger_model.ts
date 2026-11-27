/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SCHEDULED_INTERVAL_PATTERN, timezoneNames } from '@kbn/workflows';

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type ScheduleMode = 'interval' | 'calendar';
export type Repeat = 'daily' | 'weekly' | 'monthly';

/**
 * What the form of a scheduled trigger edits. The days of each repeat are kept apart, so that
 * switching Daily, Weekly and Monthly back and forth does not lose what was chosen for each.
 */
export interface ScheduleDraft {
  readonly mode: ScheduleMode;
  /** `every` as typed, e.g. `5m` or `90s`. */
  readonly intervalText: string;
  readonly repeat: Repeat;
  /** The `interval` of the rrule, as typed. */
  readonly count: string;
  readonly dailyDays: readonly Weekday[];
  readonly weeklyDays: readonly Weekday[];
  readonly monthDays: readonly number[];
  /** `HH:mm` */
  readonly time: string;
  readonly tzid: string;
}

export const DEFAULT_SCHEDULE_DRAFT: ScheduleDraft = {
  mode: 'interval',
  intervalText: '5m',
  repeat: 'weekly',
  count: '1',
  dailyDays: WEEKDAYS,
  weeklyDays: ['WE'],
  monthDays: [1],
  time: '08:00',
  tzid: 'UTC',
};

export type ScheduleErrors = Partial<
  Record<'interval' | 'count' | 'days' | 'monthDays' | 'time', true>
>;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COUNT_PATTERN = /^\d+$/;

const REPEAT_OF_FREQ: Readonly<Record<string, Repeat>> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};
const FREQ_OF_REPEAT: Readonly<Record<Repeat, string>> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
};

const RRULE_KEYS: ReadonlySet<string> = new Set([
  'freq',
  'interval',
  'tzid',
  'byhour',
  'byminute',
  'byweekday',
  'bymonthday',
]);

const TIMEZONES: ReadonlySet<string> = new Set(timezoneNames);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const pad = (value: number): string => (value < 10 ? `0${value}` : String(value));

const onlyInteger = (value: unknown, min: number, max: number): number | undefined =>
  Array.isArray(value) &&
  value.length === 1 &&
  Number.isInteger(value[0]) &&
  value[0] >= min &&
  value[0] <= max
    ? (value[0] as number)
    : undefined;

const integerList = (value: unknown, min: number, max: number): number[] | undefined =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => Number.isInteger(item) && item >= min && item <= max)
    ? Array.from(new Set(value as number[])).sort((a, b) => a - b)
    : undefined;

const weekdayList = (value: unknown): Weekday[] | undefined =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => WEEKDAYS.includes(item as Weekday))
    ? WEEKDAYS.filter((day) => value.includes(day))
    : undefined;

const parseRrule = (rrule: Record<string, unknown>): ScheduleDraft | undefined => {
  // A key the form has no control for (`dtstart`, anything unknown) would be lost on the next edit.
  if (!Object.keys(rrule).every((key) => RRULE_KEYS.has(key))) return undefined;
  const repeat = typeof rrule.freq === 'string' ? REPEAT_OF_FREQ[rrule.freq] : undefined;
  const { interval, tzid } = rrule;
  if (!repeat || typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1) {
    return undefined;
  }
  const zone = tzid === undefined ? 'UTC' : tzid;
  if (typeof zone !== 'string' || !TIMEZONES.has(zone)) return undefined;
  // Without an hour and a minute the time comes from `dtstart`, which the form does not edit.
  const hour = onlyInteger(rrule.byhour, 0, 23);
  const minute = onlyInteger(rrule.byminute, 0, 59);
  if (hour === undefined || minute === undefined) return undefined;

  const base: ScheduleDraft = {
    ...DEFAULT_SCHEDULE_DRAFT,
    mode: 'calendar',
    repeat,
    count: String(interval),
    time: `${pad(hour)}:${pad(minute)}`,
    tzid: zone,
  };
  if (repeat === 'monthly') {
    const monthDays = integerList(rrule.bymonthday, 1, 31);
    return monthDays && rrule.byweekday === undefined ? { ...base, monthDays } : undefined;
  }
  if (rrule.bymonthday !== undefined) return undefined;
  if (repeat === 'daily') {
    if (rrule.byweekday === undefined) return base;
    const days = weekdayList(rrule.byweekday);
    return days ? { ...base, dailyDays: days } : undefined;
  }
  const days = weekdayList(rrule.byweekday);
  return days ? { ...base, weeklyDays: days } : undefined;
};

/**
 * Reads the `with` of a scheduled trigger into what the form edits, or undefined when it holds
 * something the form cannot write back unchanged (a `dtstart`, several hours, an unknown time zone).
 */
export const parseSchedule = (value: unknown): ScheduleDraft | undefined => {
  if (value === undefined || value === null) return DEFAULT_SCHEDULE_DRAFT;
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (keys.length === 0) return DEFAULT_SCHEDULE_DRAFT;
  if (keys.length === 1 && keys[0] === 'every') {
    return typeof value.every === 'string'
      ? { ...DEFAULT_SCHEDULE_DRAFT, mode: 'interval', intervalText: value.every }
      : undefined;
  }
  if (keys.length === 1 && keys[0] === 'rrule' && isRecord(value.rrule)) {
    return parseRrule(value.rrule);
  }
  return undefined;
};

/** What is wrong with the draft, for the fields of the chosen mode; empty when it can be written. */
export const validateSchedule = (draft: ScheduleDraft): ScheduleErrors => {
  if (draft.mode === 'interval') {
    return SCHEDULED_INTERVAL_PATTERN.test(draft.intervalText.trim()) ? {} : { interval: true };
  }
  const errors: Record<string, true> = {};
  if (!COUNT_PATTERN.test(draft.count.trim()) || Number(draft.count) < 1) errors.count = true;
  if (!TIME_PATTERN.test(draft.time)) errors.time = true;
  if (draft.repeat === 'daily' && draft.dailyDays.length === 0) errors.days = true;
  if (draft.repeat === 'weekly' && draft.weeklyDays.length === 0) errors.days = true;
  if (draft.repeat === 'monthly' && draft.monthDays.length === 0) errors.monthDays = true;
  return errors;
};

/** The `with` to write for a draft that has no errors. */
export const scheduleToWith = (draft: ScheduleDraft): Record<string, unknown> => {
  if (draft.mode === 'interval') return { every: draft.intervalText.trim() };
  const [hour, minute] = draft.time.split(':').map(Number);
  const rrule: Record<string, unknown> = {
    freq: FREQ_OF_REPEAT[draft.repeat],
    interval: Number(draft.count),
    tzid: draft.tzid,
  };
  if (draft.repeat === 'monthly') {
    rrule.bymonthday = [...draft.monthDays].sort((a, b) => a - b);
  } else {
    const days = WEEKDAYS.filter((day) =>
      (draft.repeat === 'daily' ? draft.dailyDays : draft.weeklyDays).includes(day)
    );
    // Every day is what a daily schedule means without a list.
    if (!(draft.repeat === 'daily' && days.length === WEEKDAYS.length)) rrule.byweekday = days;
  }
  rrule.byhour = [hour];
  rrule.byminute = [minute];
  return { rrule };
};
