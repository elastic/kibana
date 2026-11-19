/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import type { Schedule } from '@kbn/response-ops-scheduling-types';
import { isIntervalSchedule, isRruleSchedule } from './schedule_guards';

const mockIntervalSchedule = { interval: '5m' } as Schedule;
const mockRruleSchedule = {
  rrule: { freq: Frequency.DAILY, interval: 1, tzid: 'UTC' },
} as Schedule;

describe('isIntervalSchedule', () => {
  it('returns true for an interval schedule', () => {
    expect(isIntervalSchedule(mockIntervalSchedule)).toBe(true);
  });

  it('returns false for an rrule schedule', () => {
    expect(isIntervalSchedule(mockRruleSchedule)).toBe(false);
  });

  it('returns false for an empty interval', () => {
    expect(isIntervalSchedule({ interval: '' } as Schedule)).toBe(false);
  });

  it('returns false when the schedule is missing', () => {
    expect(isIntervalSchedule(undefined)).toBe(false);
  });
});

describe('isRruleSchedule', () => {
  it('returns true for an rrule schedule', () => {
    expect(isRruleSchedule(mockRruleSchedule)).toBe(true);
  });

  it('returns false for an interval schedule', () => {
    expect(isRruleSchedule(mockIntervalSchedule)).toBe(false);
  });

  it('returns false when the schedule is missing', () => {
    expect(isRruleSchedule(undefined)).toBe(false);
  });
});
