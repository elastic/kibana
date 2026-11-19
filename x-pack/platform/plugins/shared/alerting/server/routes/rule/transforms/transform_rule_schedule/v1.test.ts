/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { RruleMonthly } from '@kbn/response-ops-scheduling-types';
import { transformRuleScheduleRequest, transformRuleScheduleResponse } from './v1';

const mockRruleString =
  'DTSTART;TZID=Europe/Rome:20261117T090000\nRRULE:FREQ=MONTHLY;BYHOUR=9;BYMINUTE=0;BYMONTHDAY=1';
const mockRrule: RruleMonthly = {
  freq: Frequency.MONTHLY,
  interval: 1,
  tzid: 'Europe/Rome',
  dtstart: '2026-11-17T08:00:00.000Z',
  bymonthday: [1],
  byhour: [9],
  byminute: [0],
};

describe('transformRuleScheduleRequest', () => {
  it('keeps interval schedules', () => {
    expect(transformRuleScheduleRequest({ interval: '1m' })).toEqual({ interval: '1m' });
  });

  it('parses rrule strings into objects', () => {
    expect(transformRuleScheduleRequest({ rrule: mockRruleString })).toEqual({
      rrule: mockRrule,
    });
  });
});

describe('transformRuleScheduleResponse', () => {
  it('keeps interval schedules', () => {
    expect(transformRuleScheduleResponse({ interval: '1m' })).toEqual({ interval: '1m' });
  });

  it('serializes rrule objects into strings', () => {
    expect(transformRuleScheduleResponse({ rrule: mockRrule })).toEqual({
      rrule: mockRruleString,
    });
  });
});
