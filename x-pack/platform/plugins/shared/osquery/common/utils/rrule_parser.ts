/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, Weekday, type WeekdayStr } from '@kbn/rrule';
import type { RRuleFields } from './rrule_serializer';

const STRING_TO_FREQUENCY: Record<string, Frequency> = {
  YEARLY: Frequency.YEARLY,
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
  HOURLY: Frequency.HOURLY,
  MINUTELY: Frequency.MINUTELY,
};

const STRING_TO_WEEKDAY: Record<WeekdayStr, Weekday> = {
  MO: Weekday.MO,
  TU: Weekday.TU,
  WE: Weekday.WE,
  TH: Weekday.TH,
  FR: Weekday.FR,
  SA: Weekday.SA,
  SU: Weekday.SU,
};

const parseIntegerList = (
  value: string,
  partName: string,
  validate?: (n: number) => boolean
): number[] => {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.map((item) => {
    const parsed = Number(item);
    if (!Number.isInteger(parsed)) {
      throw new Error(`Invalid integer "${item}" in RRULE ${partName}`);
    }

    if (validate && !validate(parsed)) {
      throw new Error(`Value "${item}" is out of range for RRULE ${partName}`);
    }

    return parsed;
  });
};

// BYMONTHDAY accepts 1..31 and -31..-1 (Nth-from-last day). Verified against
// teambition/rrule-go validateBounds (plusMinus=true for "bymonthday"). RFC
// 5545 §3.3.10 also permits the negative range.
const isValidByMonthday = (n: number): boolean => (n >= 1 && n <= 31) || (n >= -31 && n <= -1);

// BYMONTH is 1..12 only (no negative range per RFC 5545 §3.3.10).
const isValidByMonth = (n: number): boolean => n >= 1 && n <= 12;

const parseWeekdays = (value: string): Weekday[] =>
  value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0)
    .map((item) => {
      const weekday = STRING_TO_WEEKDAY[item as WeekdayStr];
      if (weekday === undefined) {
        throw new Error(`Invalid RRULE BYDAY value: "${item}"`);
      }

      return weekday;
    });

/**
 * Parse an RFC 5545 RRULE string into {@link RRuleFields}. Inverse of
 * {@link serializeRRule}.
 *
 * Recognized parts: `FREQ`, `INTERVAL`, `BYDAY`, `BYMONTHDAY`, `BYMONTH`. Any
 * other parts (e.g. `BYHOUR`, `WKST`, `COUNT`, `UNTIL`) are preserved in the
 * `_unknown` slot so a parse → serialize round-trip is lossless. Empty parts
 * (e.g. `";;"`) are ignored. The leading `RRULE:` prefix is also tolerated.
 */
export const parseRRule = (rrule: string): RRuleFields => {
  if (typeof rrule !== 'string') {
    throw new Error('RRULE must be a string');
  }

  const trimmed = rrule.trim().replace(/^RRULE:/i, '');
  if (trimmed.length === 0) {
    throw new Error('RRULE string is empty');
  }

  let freq: Frequency | undefined;
  let interval: number | undefined;
  let byweekday: Weekday[] | undefined;
  let bymonthday: number[] | undefined;
  let bymonth: number[] | undefined;
  const unknown: Record<string, string> = {};

  for (const segment of trimmed.split(';')) {
    if (segment.length === 0) {
      continue;
    }

    const equalsIndex = segment.indexOf('=');
    if (equalsIndex === -1) {
      throw new Error(`Invalid RRULE part (missing "="): "${segment}"`);
    }

    const rawKey = segment.slice(0, equalsIndex).trim().toUpperCase();
    const rawValue = segment.slice(equalsIndex + 1).trim();

    if (rawKey.length === 0) {
      throw new Error(`Invalid RRULE part (empty key): "${segment}"`);
    }

    switch (rawKey) {
      case 'FREQ': {
        const parsed = STRING_TO_FREQUENCY[rawValue.toUpperCase()];
        if (parsed === undefined) {
          throw new Error(`Invalid RRULE FREQ value: "${rawValue}"`);
        }

        freq = parsed;
        break;
      }

      case 'INTERVAL': {
        const parsed = Number(rawValue);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`RRULE INTERVAL must be a positive integer, got "${rawValue}"`);
        }

        interval = parsed;
        break;
      }

      case 'BYDAY':
        byweekday = parseWeekdays(rawValue);
        break;
      case 'BYMONTHDAY':
        bymonthday = parseIntegerList(rawValue, 'BYMONTHDAY', isValidByMonthday);
        break;
      case 'BYMONTH':
        bymonth = parseIntegerList(rawValue, 'BYMONTH', isValidByMonth);
        break;
      default:
        unknown[rawKey] = rawValue;
        break;
    }
  }

  if (freq === undefined) {
    throw new Error('RRULE is missing required FREQ part');
  }

  const result: RRuleFields = { freq };
  if (interval !== undefined) result.interval = interval;
  if (byweekday !== undefined) result.byweekday = byweekday;
  if (bymonthday !== undefined) result.bymonthday = bymonthday;
  if (bymonth !== undefined) result.bymonth = bymonth;
  if (Object.keys(unknown).length > 0) result._unknown = unknown;

  return result;
};
