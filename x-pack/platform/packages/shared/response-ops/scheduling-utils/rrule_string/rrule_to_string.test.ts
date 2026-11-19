/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { Rrule } from '@kbn/response-ops-scheduling-types';
import { transformRruleToRruleString } from './rrule_to_string';
import { transformRruleStringToRrule } from './string_to_rrule';

describe('transformRruleToRruleString', () => {
  it('serializes a rrule with a dtstart in a timezone', () => {
    expect(
      transformRruleToRruleString({
        freq: Frequency.WEEKLY,
        interval: 2,
        tzid: 'Europe/Rome',
        dtstart: '2026-11-17T08:00:00.000Z',
        byweekday: ['MO', 'WE'],
        byhour: [9],
        byminute: [0, 30],
      })
    ).toBe(
      'DTSTART;TZID=Europe/Rome:20261117T090000\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYHOUR=9;BYMINUTE=0,30;BYDAY=MO,WE'
    );
  });

  it('serializes a UTC dtstart with the UTC TZID', () => {
    expect(
      transformRruleToRruleString({
        freq: Frequency.DAILY,
        interval: 1,
        tzid: 'UTC',
        dtstart: '2026-11-17T09:00:00.000Z',
      })
    ).toBe('DTSTART;TZID=UTC:20261117T090000\nRRULE:FREQ=DAILY');
  });

  it('omits the timezone when there is no dtstart and the timezone is UTC', () => {
    expect(
      transformRruleToRruleString({
        freq: Frequency.HOURLY,
        interval: 1,
        tzid: 'UTC',
        byminute: [15],
      })
    ).toBe('RRULE:FREQ=HOURLY;BYMINUTE=15');
  });

  it('puts the timezone of a rule saved without a dtstart in the RRULE line', () => {
    expect(
      transformRruleToRruleString({
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'America/New_York',
        bymonthday: [1, 15],
        byweekday: ['+1MO'],
      })
    ).toBe('RRULE:FREQ=MONTHLY;BYDAY=+1MO;BYMONTHDAY=1,15;TZID=America/New_York');
  });

  it.each<[string, Rrule]>([
    [
      'weekly in a timezone',
      {
        freq: Frequency.WEEKLY,
        interval: 1,
        tzid: 'Asia/Tokyo',
        dtstart: '2026-03-01T00:00:00.000Z',
        byweekday: ['FR'],
        byhour: [18],
        byminute: [0],
      },
    ],
    [
      'monthly without dtstart',
      {
        freq: Frequency.MONTHLY,
        interval: 3,
        tzid: 'UTC',
        bymonthday: [31],
        byhour: [0, 12],
      },
    ],
    [
      'monthly with ordinal weekdays',
      {
        freq: Frequency.MONTHLY,
        interval: 1,
        tzid: 'America/New_York',
        dtstart: '2026-01-05T14:00:00.000Z',
        byweekday: ['+1MO', '-1FR'],
      },
    ],
    ['hourly in UTC', { freq: Frequency.HOURLY, interval: 6, tzid: 'UTC', byminute: [5] }],
  ])('round trips %s', (_, rrule) => {
    expect(transformRruleStringToRrule(transformRruleToRruleString(rrule))).toEqual(rrule);
  });
});
