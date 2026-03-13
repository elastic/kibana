/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { adHocRunStatus } from '../../../common/constants';
import { calculateSchedule, MAX_SCHEDULE_ENTRIES } from './calculate_schedule';

describe('calculateSchedule', () => {
  test('should calculate schedule using start and end time', () => {
    const { schedule, truncated } = calculateSchedule('1h', [
      { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T13:00:00.000Z' },
    ]);
    expect(truncated).toBe(false);
    expect(schedule).toEqual([
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

    const result24m = calculateSchedule('24m', [
      { start: '2023-11-16T08:42:45.751Z', end: '2023-11-16T10:54:23.000Z' },
    ]);
    expect(result24m.truncated).toBe(false);
    expect(result24m.schedule).toEqual([
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
    const { schedule, truncated } = calculateSchedule('1h', [
      { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T10:00:00.000Z' },
      { start: '2023-11-16T12:00:00.000Z', end: '2023-11-16T14:00:00.000Z' },
    ]);
    expect(truncated).toBe(false);
    expect(schedule).toEqual([
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
    const { schedule, truncated } = calculateSchedule('1h', [
      { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T12:38:23.252Z' },
    ]);
    expect(truncated).toBe(false);
    expect(schedule).toEqual([
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

  test('should truncate schedule at MAX_SCHEDULE_ENTRIES and set truncated flag', () => {
    // 1-minute interval over 8 days = 11,520 entries > 10,000 cap
    const { schedule, truncated } = calculateSchedule('1m', [
      { start: '2023-11-16T00:00:00.000Z', end: '2023-11-24T00:00:00.000Z' },
    ]);
    expect(schedule).toHaveLength(MAX_SCHEDULE_ENTRIES);
    expect(truncated).toBe(true);
  });

  test('should not set truncated when schedule exactly fills range', () => {
    // 1-hour interval over 5 hours = exactly 5 entries, well under cap
    const { schedule, truncated } = calculateSchedule('1h', [
      { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T13:00:00.000Z' },
    ]);
    expect(schedule).toHaveLength(5);
    expect(truncated).toBe(false);
  });

  test('should truncate across multiple ranges and set truncated flag', () => {
    const halfPlus = Math.ceil(MAX_SCHEDULE_ENTRIES / 2) + 1;
    const endMs1 = new Date('2023-11-16T00:00:00.000Z').valueOf() + halfPlus * 60_000;
    const startMs2 = endMs1 + 3_600_000;
    const endMs2 = startMs2 + halfPlus * 60_000;
    const { schedule, truncated } = calculateSchedule('1m', [
      { start: '2023-11-16T00:00:00.000Z', end: new Date(endMs1).toISOString() },
      { start: new Date(startMs2).toISOString(), end: new Date(endMs2).toISOString() },
    ]);
    expect(schedule).toHaveLength(MAX_SCHEDULE_ENTRIES);
    expect(truncated).toBe(true);
  });

  test('should calculate schedule with multiple ranges with gaps', () => {
    const { schedule, truncated } = calculateSchedule('30m', [
      { start: '2023-11-16T08:00:00.000Z', end: '2023-11-16T09:00:00.000Z' },
      { start: '2023-11-16T10:00:00.000Z', end: '2023-11-16T11:00:00.000Z' },
      { start: '2023-11-16T12:00:00.000Z', end: '2023-11-16T13:00:00.000Z' },
    ]);
    expect(truncated).toBe(false);
    expect(schedule).toEqual([
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
});
