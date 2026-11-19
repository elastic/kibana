/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RRuleTemporal, type TemporalZonedDateTimeInput } from 'rrule-temporal';
import { Frequency } from '@kbn/rrule';
import type { Rrule } from '@kbn/response-ops-scheduling-types';
import {
  RRULE_STRING_PLACEHOLDER_DTSTART,
  RRULE_STRING_UTC_TZID,
  type RruleStringFrequency,
} from '../../constants';

const FREQUENCY_NAMES: Record<Rrule['freq'], RruleStringFrequency> = {
  [Frequency.MONTHLY]: 'MONTHLY',
  [Frequency.WEEKLY]: 'WEEKLY',
  [Frequency.DAILY]: 'DAILY',
  [Frequency.HOURLY]: 'HOURLY',
};

const toZonedDateTime = (dtstart: string, tzid: string): TemporalZonedDateTimeInput => ({
  timeZoneId: tzid,
  toString: () => `${new Date(dtstart).toISOString()}[${tzid}]`,
});

const nonEmpty = <T>(values?: T[]) => (values?.length ? values : undefined);

/**
 * Transforms a rule schedule rrule into its RFC 5545 style string representation.
 */
export const transformRruleToRruleString = (rrule: Rrule): string => {
  const { freq, interval, tzid, dtstart, byweekday, byhour, byminute, bymonthday } = rrule;

  const ruleString = new RRuleTemporal({
    freq: FREQUENCY_NAMES[freq],
    interval,
    byDay: nonEmpty(byweekday),
    byHour: nonEmpty(byhour),
    byMinute: nonEmpty(byminute),
    byMonthDay: nonEmpty(bymonthday),
    dtstart: dtstart ? toZonedDateTime(dtstart, tzid) : RRULE_STRING_PLACEHOLDER_DTSTART,
  }).toString();

  if (dtstart) {
    return ruleString;
  }

  // Drop the placeholder DTSTART line
  const rruleLine = ruleString.split('\n').find((line) => line.startsWith('RRULE:')) ?? '';
  // Rules saved without a dtstart can still have a timezone, which only fits in the RRULE line
  return tzid === RRULE_STRING_UTC_TZID ? rruleLine : `${rruleLine};TZID=${tzid}`;
};
