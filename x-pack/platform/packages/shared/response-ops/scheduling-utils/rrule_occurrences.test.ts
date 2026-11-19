/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { Rrule } from '@kbn/response-ops-scheduling-types';
import { getNextRruleOccurrence, getRruleOccurrences } from './rrule_occurrences';

const dailyAtNine: Rrule = {
  freq: Frequency.DAILY,
  interval: 1,
  tzid: 'UTC',
  byhour: [9],
  byminute: [0],
};

describe('getNextRruleOccurrence', () => {
  // Without a dtstart the rrule starts from now
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-17T08:00:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('returns the first occurrence after the given date', () => {
    expect(getNextRruleOccurrence(dailyAtNine, new Date('2026-11-17T10:30:00.000Z'))).toEqual(
      new Date('2026-11-18T09:00:00.000Z')
    );
  });

  it('skips an occurrence landing exactly on the given date', () => {
    expect(getNextRruleOccurrence(dailyAtNine, new Date('2026-11-17T09:00:00.000Z'))).toEqual(
      new Date('2026-11-18T09:00:00.000Z')
    );
  });

  it('does not return occurrences before the dtstart', () => {
    expect(
      getNextRruleOccurrence(
        { ...dailyAtNine, dtstart: '2099-01-05T09:00:00.000Z' },
        new Date('2026-11-17T10:30:00.000Z')
      )
    ).toEqual(new Date('2099-01-05T09:00:00.000Z'));
  });
});

describe('getRruleOccurrences', () => {
  it('returns the occurrences after the start and up to the end', () => {
    expect(
      getRruleOccurrences(dailyAtNine, '2026-11-17T09:00:00.000Z', '2026-11-19T09:00:00.000Z')
    ).toEqual([new Date('2026-11-18T09:00:00.000Z'), new Date('2026-11-19T09:00:00.000Z')]);
  });

  it('stops at the max number of entries', () => {
    expect(
      getRruleOccurrences(dailyAtNine, '2026-11-17T00:00:00.000Z', '2026-12-31T00:00:00.000Z', 2)
    ).toHaveLength(2);
  });

  it('handles ranges far from an old dtstart', () => {
    expect(
      getRruleOccurrences(
        { ...dailyAtNine, dtstart: '1990-01-01T09:00:00.000Z' },
        '2026-11-17T00:00:00.000Z',
        '2026-11-18T00:00:00.000Z'
      )
    ).toEqual([new Date('2026-11-17T09:00:00.000Z')]);
  });
});
