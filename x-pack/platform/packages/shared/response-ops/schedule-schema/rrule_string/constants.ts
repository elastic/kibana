/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { TemporalZonedDateTimeInput } from 'rrule-temporal';

export const RRULE_STRING_MAX_LENGTH = 1024;

export const RRULE_STRING_DESCRIPTION =
  'A recurrence rule in RFC 5545 format: an optional `DTSTART` line followed by an `RRULE` line, separated by a newline. For example `DTSTART;TZID=Europe/Rome:20260101T090000\\nRRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;BYHOUR=9;BYMINUTE=0`. Supported `RRULE` parts are `FREQ` (`MONTHLY`, `WEEKLY`, `DAILY` or `HOURLY`), `INTERVAL`, `BYMONTHDAY`, `BYDAY`, `BYHOUR` and `BYMINUTE`, other parts are ignored. Set the timezone with `DTSTART;TZID=`. Without it, the rule runs in UTC.';

export const RRULE_STRING_UTC_TZID = 'UTC';

export const RRULE_STRING_FREQUENCIES = {
  MONTHLY: Frequency.MONTHLY,
  WEEKLY: Frequency.WEEKLY,
  DAILY: Frequency.DAILY,
  HOURLY: Frequency.HOURLY,
} as const;

export type RruleStringFrequency = keyof typeof RRULE_STRING_FREQUENCIES;

/**
 * rrule-temporal needs a DTSTART. Rules without one get this placeholder, which is never stored.
 */
export const RRULE_STRING_PLACEHOLDER_DTSTART: TemporalZonedDateTimeInput = {
  timeZoneId: RRULE_STRING_UTC_TZID,
  toString: () => '1970-01-01T00:00:00+00:00[UTC]',
};
