/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YamlObject, YamlValue } from './compare_rebuilt_workflow';

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
type Weekday = (typeof WEEKDAYS)[number];

/** What the Date & time form of a scheduled trigger holds. */
export interface ScheduleFormShape {
  readonly repeat: 'daily' | 'weekly' | 'monthly';
  /** The rrule's `interval`: every N days, weeks or months. */
  readonly count: number;
  readonly tzid: string;
  /** `HH:mm` */
  readonly time: string;
  /** Daily and weekly rules. */
  readonly days?: readonly Weekday[];
  /** Monthly rules. */
  readonly monthDays?: readonly number[];
}

const isRecord = (value: YamlValue | undefined): value is YamlObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const REPEAT_OF_FREQ: Readonly<Record<string, ScheduleFormShape['repeat']>> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

const ALLOWED_KEYS = new Set([
  'freq',
  'interval',
  'tzid',
  'byhour',
  'byminute',
  'byweekday',
  'bymonthday',
]);

const onlyInteger = (value: YamlValue | undefined, max: number): number | undefined => {
  if (!Array.isArray(value) || value.length !== 1) return undefined;
  const [item] = value;
  return typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= max
    ? item
    : undefined;
};

const pad = (value: number): string => String(value).padStart(2, '0');

const monthlyShape = (
  base: Omit<ScheduleFormShape, 'monthDays' | 'days'>,
  rrule: YamlObject
): ScheduleFormShape | undefined => {
  const { bymonthday, byweekday } = rrule;
  const valid =
    byweekday === undefined &&
    Array.isArray(bymonthday) &&
    bymonthday.length > 0 &&
    bymonthday.every(
      (day) => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31
    );
  return valid ? { ...base, monthDays: bymonthday as number[] } : undefined;
};

const dailyOrWeeklyShape = (
  base: Omit<ScheduleFormShape, 'monthDays' | 'days'>,
  rrule: YamlObject
): ScheduleFormShape | undefined => {
  const { bymonthday, byweekday } = rrule;
  if (bymonthday !== undefined) return undefined;
  // No list is every day, for a daily rule.
  if (byweekday === undefined) {
    return base.repeat === 'daily' ? { ...base, days: WEEKDAYS } : undefined;
  }
  const valid =
    Array.isArray(byweekday) &&
    byweekday.length > 0 &&
    byweekday.every((day) => WEEKDAYS.includes(day as Weekday));
  return valid ? { ...base, days: byweekday as Weekday[] } : undefined;
};

/**
 * What the Date & time form can hold of an rrule, or undefined when it would lose something (a `dtstart`,
 * several hours, an unlisted frequency): the panel then says "This schedule is edited in YAML" and has no
 * controls. Mirrors `parseSchedule` of the form.
 */
export const scheduleFormShape = (rrule: YamlValue | undefined): ScheduleFormShape | undefined => {
  if (!isRecord(rrule) || !Object.keys(rrule).every((key) => ALLOWED_KEYS.has(key))) {
    return undefined;
  }
  const repeat = typeof rrule.freq === 'string' ? REPEAT_OF_FREQ[rrule.freq] : undefined;
  const { interval, tzid } = rrule;
  if (!repeat || typeof interval !== 'number' || !Number.isInteger(interval) || interval < 1) {
    return undefined;
  }
  const hour = onlyInteger(rrule.byhour, 23);
  const minute = onlyInteger(rrule.byminute, 59);
  if (hour === undefined || minute === undefined) return undefined;
  const base = {
    repeat,
    count: interval,
    tzid: typeof tzid === 'string' ? tzid : 'UTC',
    time: `${pad(hour)}:${pad(minute)}`,
  };
  return repeat === 'monthly' ? monthlyShape(base, rrule) : dailyOrWeeklyShape(base, rrule);
};

/**
 * A schedule as the form writes it: the default time zone is written out, every day of a daily rule is no
 * list, and lists are sorted. A schedule that is not an rrule is returned as it is.
 */
export const normalizeSchedule = (schedule: YamlValue): YamlValue => {
  if (!isRecord(schedule) || !isRecord(schedule.rrule)) return schedule;
  const rrule: YamlObject = { ...schedule.rrule, tzid: schedule.rrule.tzid ?? 'UTC' };
  const { byweekday, bymonthday } = rrule;
  if (Array.isArray(byweekday)) {
    const days = WEEKDAYS.filter((day) => byweekday.includes(day));
    if (rrule.freq === 'DAILY' && days.length === WEEKDAYS.length) delete rrule.byweekday;
    else rrule.byweekday = days;
  }
  if (Array.isArray(bymonthday)) {
    rrule.bymonthday = [...(bymonthday as number[])].sort((a, b) => a - b);
  }
  return { rrule };
};
