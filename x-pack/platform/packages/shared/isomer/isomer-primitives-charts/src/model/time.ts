/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { crossRefine, statedRefine } from './cross_field';
import { labelText } from './text';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export const timeRule =
  'a time is an ISO 8601 date (`2026-10-14`) or a date-time with `Z` or an offset (`2026-10-14T09:30:00Z`) that names a real moment';

/** A calendar date is noon UTC on that day, so no time zone moves it to a neighbour. */
const instantOf = (value: string): number =>
  ISO_DATE.test(value)
    ? Date.parse(`${value}T12:00:00Z`)
    : ISO_INSTANT.test(value)
    ? Date.parse(value)
    : Number.NaN;

const realDate = (value: string): boolean => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
};

/** Whether `value` is a time {@link timeRule} accepts. */
export const isTime = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(instantOf(value)) && realDate(value);

export const isoTime = () =>
  labelText().check(
    statedRefine(isTime, {
      error: 'is not an ISO 8601 date or date-time',
      rule: timeRule,
    })
  );

export const DEFAULT_TIME_ZONE = 'UTC';

export const timeKindRule = 'the times on one axis are all dates or all date-times';
export const timeSpellingRule = 'one moment is written the same way everywhere on the axis';

/** For each value breaking a time-axis rule, its index and the rule, in value order. */
export const timeAxisIssues = (values: readonly unknown[]): { index: number; rule: string }[] => {
  const issues: { index: number; rule: string }[] = [];
  const spellings = new Map<number, string>();
  let dates: boolean | undefined;
  values.forEach((value, index) => {
    if (!isTime(value)) {
      issues.push({ index, rule: timeRule });
      return;
    }
    const isDate = ISO_DATE.test(value);
    dates ??= isDate;
    if (dates !== isDate) {
      issues.push({ index, rule: timeKindRule });
      return;
    }
    const instant = instantOf(value);
    const spelled = spellings.get(instant);
    if (spelled === undefined) {
      spellings.set(instant, value);
    } else if (spelled !== value) {
      issues.push({ index, rule: timeSpellingRule });
    }
  });
  return issues;
};

export const timeZoneRule = 'the time zone is an IANA name such as `UTC` or `Europe/Amsterdam`';

const isTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const timeZoneSchema = () =>
  labelText()
    .check(
      statedRefine(isTimeZone, {
        error: 'is not an IANA time zone',
        rule: timeZoneRule,
      })
    )
    .describe(`Where times are read and printed. Defaults to \`UTC\`; ${timeZoneRule}.`);

export const GRANULARITIES = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;

export type Granularity = (typeof GRANULARITIES)[number];

export const granularitySchema = () =>
  z
    .enum(GRANULARITIES)
    .describe(
      'The finest unit the times differ by, which decides how they print: `day` prints `Oct 14, 2026`, `hour` adds `09:00`. Defaults to `day` when every time is a date, else `minute`.'
    );

const PARTS: Record<Granularity, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { year: 'numeric', month: 'short' },
  day: { year: 'numeric', month: 'short', day: 'numeric' },
  hour: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  minute: {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  second: {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  },
};

/** `day` for an axis of calendar dates, which carry no time of day; else `minute`. */
export const defaultGranularity = (values: readonly string[]): Granularity =>
  values.length > 0 && values.every((value) => ISO_DATE.test(value)) ? 'day' : 'minute';

/** A table column of times, naming the zone they print in. */
export const timeColumn = (column: string, timeZone: string): string => `${column} (${timeZone})`;

/** Milliseconds since the epoch, for ordering. */
export const timeValue = (value: string): number => instantOf(value);

export const formatTime = (
  value: string,
  { timeZone, granularity }: { timeZone: string; granularity: Granularity }
): string =>
  new Intl.DateTimeFormat('en-US', {
    ...PARTS[granularity],
    hourCycle: 'h23',
    timeZone: ISO_DATE.test(value) ? 'UTC' : timeZone,
  }).format(instantOf(value));

export const INTERVAL_UNITS = [
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
] as const;

export const intervalRule =
  'every bucket `interval` starts, at each time on the axis or at `domain.from`, ends at a real moment';

export const timeIntervalSchema = () =>
  z
    .object({
      value: z.number().int().positive(),
      unit: z.enum(INTERVAL_UNITS),
    })
    .strict()
    .describe(
      `The bucket each time starts, e.g. \`{ "value": 1, "unit": "day" }\`. Calendar units follow the axis time zone; ${intervalRule}.`
    );

export type TimeInterval = z.infer<ReturnType<typeof timeIntervalSchema>>;

const FIXED_MS: Partial<Record<TimeInterval['unit'], number>> = {
  millisecond: 1,
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
};

/** The wall clock in `timeZone` at `instant`, as if it were UTC. */
const wallClock = (instant: number, timeZone: string): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, Number(value)])
  );
  return (
    Date.UTC(parts.year!, parts.month! - 1, parts.day, parts.hour, parts.minute, parts.second) +
    (((instant % 1000) + 1000) % 1000)
  );
};

/** The ECMAScript `Date` range, in milliseconds either side of the epoch. */
const MAX_INSTANT = 8.64e15;

const isInstant = (value: number): boolean => Math.abs(value) <= MAX_INSTANT;

/**
 * Where a bucket starting at `start` ends, stepping calendar units on the wall clock in `timeZone`;
 * `NaN` when the end falls outside the `Date` range.
 */
export const bucketEnd = (
  start: number,
  { value, unit }: TimeInterval,
  timeZone: string
): number => {
  const fixed = FIXED_MS[unit];
  if (fixed !== undefined) {
    const end = start + value * fixed;
    return isInstant(end) ? end : Number.NaN;
  }
  const wall = new Date(wallClock(start, timeZone));
  if (unit === 'year') {
    wall.setUTCFullYear(wall.getUTCFullYear() + value);
  } else if (unit === 'month') {
    wall.setUTCMonth(wall.getUTCMonth() + value);
  } else {
    wall.setUTCDate(wall.getUTCDate() + value * (unit === 'week' ? 7 : 1));
  }
  const target = wall.getTime();
  const guess = target - (wallClock(start, timeZone) - start);
  if (!isInstant(target) || !isInstant(guess)) {
    return Number.NaN;
  }
  const end = target - (wallClock(guess, timeZone) - guess);
  return isInstant(end) ? end : Number.NaN;
};

export const windowRule = '`domain.from` is before `domain.to`';

export const timeWindowSchema = () =>
  z
    .object({ from: isoTime(), to: isoTime() })
    .strict()
    .check(
      crossRefine(({ from, to }) => timeValue(from) < timeValue(to), {
        error: windowRule,
        rule: windowRule,
      })
    );

/** The shortest bucket at any of `starts`, or the closest two starts if nearer; at `fallback` when there are none. */
export const shortestBucket = (
  starts: readonly number[],
  interval: TimeInterval,
  timeZone: string,
  fallback: number
): number =>
  Math.min(
    ...(starts.length === 0 ? [fallback] : starts).map(
      (start) => bucketEnd(start, interval, timeZone) - start
    ),
    ...starts.slice(1).map((start, index) => start - starts[index]!)
  );

/** Whether every bucket {@link shortestBucket} measures over `times` ends at a real moment, per {@link intervalRule}. */
export const bucketsResolve = (
  times: readonly string[],
  interval: TimeInterval,
  timeZone: string,
  domainFrom: string | undefined
): boolean =>
  Number.isFinite(
    shortestBucket(
      [...new Set(times.map(timeValue))].sort((a, b) => a - b),
      interval,
      timeZone,
      domainFrom === undefined ? 0 : timeValue(domainFrom)
    )
  );
