/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '../mocks';

import { getNextRunAt } from './get_next_run_at';
import { loggerMock } from '@kbn/logging-mocks';
const mockLogger = loggerMock.create();

describe('getNextRunAt', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('should use startedAt when the task delay is greater than the threshold', () => {
    const now = new Date();
    // Use time in the past to ensure the task delay calculation isn't relative to "now"
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const fourSecondsAgo = new Date(now.getTime() - 4000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveSecondsAgo,
        startedAt: fourSecondsAgo,
      }),
      500,
      mockLogger
    );
    expect(nextRunAt).toEqual(new Date(fourSecondsAgo.getTime() + 60000));
  });

  test('should use runAt when the task delay is greater than the threshold', () => {
    const now = new Date();
    // Use time in the past to ensure the task delay calculation isn't relative to "now"
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    const aBitLessThanFiveSecondsAgo = new Date(now.getTime() - 4995);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveSecondsAgo,
        startedAt: aBitLessThanFiveSecondsAgo,
      }),
      500,
      mockLogger
    );
    expect(nextRunAt).toEqual(new Date(fiveSecondsAgo.getTime() + 60000));
  });

  test('should not schedule in the past', () => {
    const testStart = new Date();
    const fiveMinsAgo = new Date(Date.now() - 300000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: { interval: '1m' },
        runAt: fiveMinsAgo,
        startedAt: fiveMinsAgo,
      }),
      0,
      mockLogger
    );
    expect(nextRunAt.getTime()).toBeGreaterThanOrEqual(testStart.getTime());
  });

  test('should use the rrule with a fixed time when it is given to calculate the next runAt (same day)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-30T10:00:00.000Z'));
    const now = new Date();
    const testStart = new Date(now.getTime() - 500);
    const testRunAt = new Date(now.getTime() - 1000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: {
          rrule: {
            freq: 3, // Daily
            interval: 1,
            tzid: 'UTC',
            byhour: [12],
            byminute: [15],
          },
        },
        runAt: testRunAt,
        startedAt: testStart,
      }),
      0,
      mockLogger
    );
    const expectedNextRunAt = new Date('2025-06-30T12:15:59.500Z');
    expect(nextRunAt).toEqual(expectedNextRunAt);
    jest.useRealTimers();
  });

  test('should use the rrule with a fixed time when it is given to calculate the next runAt (next day)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-30T13:00:00.000Z'));
    const now = new Date();
    const testStart = new Date(now.getTime() - 500);
    const testRunAt = new Date(now.getTime() - 1000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: {
          rrule: {
            freq: 3, // Daily
            interval: 1,
            tzid: 'UTC',
            byhour: [12],
            byminute: [15],
          },
        },
        runAt: testRunAt,
        startedAt: testStart,
      }),
      0,
      mockLogger
    );
    const expectedNextRunAt = new Date('2025-07-01T12:15:59.500Z');
    expect(nextRunAt).toEqual(expectedNextRunAt);
    jest.useRealTimers();
  });

  test('should use now even if dtstart defined in rrule with a fixed time when it is given to calculate the next runAt', () => {
    jest.useFakeTimers();
    const now = new Date('2025-04-30T10:00:00.000Z');
    jest.setSystemTime(now);
    const testStart = new Date(now.getTime() - 500);
    const testRunAt = new Date(now.getTime() - 1000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: {
          rrule: {
            dtstart: '2025-01-15T13:01:02Z',
            freq: 3, // Daily
            interval: 1,
            tzid: 'UTC',
            byhour: [12],
            byminute: [15],
          },
        },
        runAt: testRunAt,
        startedAt: testStart,
      }),
      0,
      mockLogger
    );

    const expectedNextRunAt = new Date('2025-04-30T12:15:59.500Z');
    expect(nextRunAt).toEqual(expectedNextRunAt);

    jest.clearAllTimers();
  });

  test('should use the rrule with a basic interval time when it is given to calculate the next runAt', () => {
    const now = new Date();
    const testStart = now;
    const testRunAt = new Date(now.getTime() - 1000);
    const nextRunAt = getNextRunAt(
      taskManagerMock.createTask({
        schedule: {
          rrule: {
            freq: 3, // Daily
            interval: 1,
            tzid: 'UTC',
          },
        },
        runAt: testRunAt,
        startedAt: testStart,
      }),
      0,
      mockLogger
    );

    const oneDay = 24 * 60 * 60 * 1000;
    const expectedNextRunAt = new Date(testStart.getTime() + oneDay);

    expect(nextRunAt).toEqual(expectedNextRunAt);
  });

  test('should throw an error if the next runAt cannot be calculated', () => {
    const now = new Date();
    const testStart = now;
    const testRunAt = new Date(now.getTime() - 1000);

    expect(() =>
      getNextRunAt(
        taskManagerMock.createTask({
          schedule: {
            rrule: {
              freq: 3, // Daily
              interval: 1,
              tzid: 'UTC',
              // @ts-ignore
              count: 1, // Invalid field for rrule
            },
          },
          runAt: testRunAt,
          startedAt: testStart,
        }),
        0,
        mockLogger
      )
    ).toThrow(`Cannot read properties of null (reading 'getTime')`);

    expect(mockLogger.error).toHaveBeenCalledWith(
      "The next runAt for the task with a fixed time schedule could not be calculated: TypeError: Cannot read properties of null (reading 'getTime')"
    );
  });
});
