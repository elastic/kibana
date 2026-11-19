/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRuleTemporal, type RRuleResolvedOptions } from 'rrule-temporal';
import { Frequency } from '@kbn/rrule';
import type { Rrule } from '@kbn/response-ops-scheduling-types';
import {
  RRULE_STRING_FREQUENCIES,
  RRULE_STRING_PLACEHOLDER_DTSTART,
  type RruleStringFrequency,
} from './constants';

export type ParseRruleStringResult =
  | { rrule: Rrule; error?: never }
  | { rrule?: never; error: string };

// Only used to know whether to store the dtstart, rrule-temporal parses the line itself
const DTSTART_LINE_REGEX = /^\s*DTSTART[:;]/im;

class RruleStringError extends Error {}

const isRruleStringFrequency = (value: string): value is RruleStringFrequency =>
  value in RRULE_STRING_FREQUENCIES;

const parseWithLibrary = (value: string): RRuleTemporal => {
  try {
    // A DTSTART in the string takes precedence over the placeholder
    return new RRuleTemporal({
      rruleString: value,
      dtstart: RRULE_STRING_PLACEHOLDER_DTSTART,
      strict: true,
    });
  } catch (error) {
    throw new RruleStringError(error instanceof Error ? error.message : String(error));
  }
};

// The task manager schema needs an explicit sign on BYDAY ordinals
const normalizeWeekday = (weekday: string) =>
  /^\d/.test(weekday) ? `+${weekday.toUpperCase()}` : weekday.toUpperCase();

/**
 * Converts the rule parsed by rrule-temporal into the rrule shape task manager schedules with.
 * Drops the placeholder dtstart when the string had no DTSTART, and the parts each frequency doesn't support.
 */
const toTaskManagerRrule = (
  { freq, interval, tzid, dtstart, byDay, byHour, byMinute, byMonthDay }: RRuleResolvedOptions,
  hasDtstart: boolean
): Rrule => {
  // Rules only support a subset of the frequencies
  if (!isRruleStringFrequency(freq)) {
    throw new RruleStringError(
      `Unsupported FREQ "${freq}". Supported values: ${Object.keys(RRULE_STRING_FREQUENCIES).join(
        ', '
      )}`
    );
  }

  const common = {
    // The library always sets these, but its types mark them as optional
    interval: interval ?? 1,
    tzid: tzid ?? dtstart.timeZoneId,
    ...(hasDtstart ? { dtstart: new Date(dtstart.epochMilliseconds).toISOString() } : {}),
  };
  const byminute = byMinute?.length ? { byminute: byMinute } : {};
  const byhour = byHour?.length ? { byhour: byHour } : {};
  const byweekday = byDay?.length ? { byweekday: byDay.map(normalizeWeekday) } : {};

  switch (freq) {
    case 'MONTHLY':
      return {
        ...common,
        freq: Frequency.MONTHLY,
        ...(byMonthDay?.length ? { bymonthday: byMonthDay } : {}),
        ...byweekday,
        ...byhour,
        ...byminute,
      };
    case 'WEEKLY':
      return { ...common, freq: Frequency.WEEKLY, ...byweekday, ...byhour, ...byminute };
    case 'DAILY':
      return { ...common, freq: Frequency.DAILY, ...byweekday, ...byhour, ...byminute };
    case 'HOURLY':
      return { ...common, freq: Frequency.HOURLY, ...byminute };
  }
};

const parse = (value: string): Rrule =>
  toTaskManagerRrule(parseWithLibrary(value).options(), DTSTART_LINE_REGEX.test(value));

/**
 * Parses an RFC 5545 style rrule string (optional DTSTART line plus an RRULE line) into a rule schedule rrule.
 */
export const parseRruleString = (value: string): ParseRruleStringResult => {
  try {
    return { rrule: parse(value) };
  } catch (error) {
    if (error instanceof RruleStringError) {
      return { error: error.message };
    }
    throw error;
  }
};

/**
 * Transforms a valid rrule string into a rule schedule rrule. Throws if the string is invalid.
 */
export const transformRruleStringToRrule = (value: string): Rrule => {
  const { rrule, error } = parseRruleString(value);
  if (error !== undefined) {
    throw new Error(`Invalid rrule schedule: ${error}`);
  }
  return rrule;
};
