/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../../common/constants';
import { calculateSchedule } from './calculate_schedule';

describe('calculateSchedule', () => {
  test('should calculate schedule using start and end time', () => {
    expect(
      calculateSchedule({ interval: '1h' }, [
        { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T13:00:00.000Z' },
      ])
    ).toEqual([
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T11:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T12:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T13:00:00.000Z',
      },
    ]);

    expect(
      calculateSchedule({ interval: '24m' }, [
        { start: '2023-11-16T08:42:45.751Z', end: '2023-11-16T10:54:23.000Z' },
      ])
    ).toEqual([
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:06:45.751Z',
      },
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:30:45.751Z',
      },
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:54:45.751Z',
      },
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:18:45.751Z',
      },
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:42:45.751Z',
      },
      {
        interval: '24m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T11:06:45.751Z',
      },
    ]);
  });

  test('should calculate schedule with multiple ranges', () => {
    expect(
      calculateSchedule({ interval: '1h' }, [
        { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T10:00:00.000Z' },
        { start: '2023-11-16T12:00:00.000Z', end: '2023-11-16T14:00:00.000Z' },
      ])
    ).toEqual([
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T13:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T14:00:00.000Z',
      },
    ]);
  });

  test('should calculate schedule when start and end are not multiple of interval', () => {
    expect(
      calculateSchedule({ interval: '1h' }, [
        { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T12:38:23.252Z' },
      ])
    ).toEqual([
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T11:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T12:00:00.000Z',
      },
      {
        interval: '1h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T13:00:00.000Z',
      },
    ]);
  });

  test('should calculate schedule with multiple ranges with gaps', () => {
    expect(
      calculateSchedule({ interval: '30m' }, [
        { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T09:00:00.000Z' },
        { start: '2023-11-16T10:00:00.000Z', end: '2023-11-16T11:00:00.000Z' },
        { start: '2023-11-16T12:00:00.000Z', end: '2023-11-16T13:00:00.000Z' },
      ])
    ).toEqual([
      // First range: 8:00-9:00
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T08:30:00.000Z',
      },
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T09:00:00.000Z',
      },
      // Second range: 10:00-11:00
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T10:30:00.000Z',
      },
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T11:00:00.000Z',
      },
      // Third range: 12:00-13:00
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T12:30:00.000Z',
      },
      {
        interval: '30m',
        status: adHocRunStatus.PENDING,
        runAt: '2023-11-16T13:00:00.000Z',
      },
    ]);
  });

  test('should calculate schedule from rrule (daily at fixed time)', () => {
    const schedule = calculateSchedule(
      {
        rrule: {
          dtstart: '2023-11-16T00:00:00.000Z',
          freq: 3, // Daily
          interval: 1,
          tzid: 'UTC',
          byhour: [12],
          byminute: [15],
        },
      },
      [{ start: '2023-11-16T08:00:00.000Z', end: '2023-11-18T14:00:00.000Z' }]
    );
    expect(schedule).toEqual([
      { status: adHocRunStatus.PENDING, runAt: '2023-11-16T12:15:00.000Z', interval: '1s' },
      { status: adHocRunStatus.PENDING, runAt: '2023-11-17T12:15:00.000Z', interval: '1s' },
      { status: adHocRunStatus.PENDING, runAt: '2023-11-18T12:15:00.000Z', interval: '1s' },
    ]);
  });

  test('throws when schedule is neither interval nor rrule', () => {
    expect(() =>
      calculateSchedule({} as Parameters<typeof calculateSchedule>[0], [
        { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T10:00:00.000Z' },
      ])
    ).toThrow('Invalid schedule, unable to calculate backfill run times');
  });
});
