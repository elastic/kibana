/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '../mocks';

import {
  calculateNextRunAtFromSchedule,
  getNextRunAt,
  getRRuleScheduleDurationMs,
} from './get_next_run_at';
import { loggerMock } from '@kbn/logging-mocks';
import type { RruleSchedule } from '../task';
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

  describe('hourly rrule claimed before its runAt', () => {
    const schedule: RruleSchedule = {
      rrule: { freq: 4, interval: 1, tzid: 'Europe/Berlin', byminute: [13] },
    };
    const runAt = new Date('2026-08-10T16:13:00.000Z');

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should skip to the next occurrence when the run started early', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-10T16:11:31.650Z'));

      const nextRunAt = getNextRunAt(
        taskManagerMock.createTask({
          schedule,
          runAt,
          startedAt: new Date('2026-08-10T16:11:09.328Z'),
        }),
        3000,
        mockLogger
      );

      expect(nextRunAt).toEqual(new Date('2026-08-10T17:13:00.000Z'));
    });

    test('should use the next occurrence when the run started on time', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-10T16:13:20.478Z'));

      const nextRunAt = getNextRunAt(
        taskManagerMock.createTask({
          schedule,
          runAt,
          startedAt: new Date('2026-08-10T16:13:00.196Z'),
        }),
        3000,
        mockLogger
      );

      expect(nextRunAt).toEqual(new Date('2026-08-10T17:13:00.000Z'));
    });

    test('calculateNextRunAtFromSchedule only uses previousRunAt when provided', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-10T16:11:31.650Z'));

      expect(calculateNextRunAtFromSchedule({ schedule, startDate: runAt })).toEqual(
        runAt.getTime()
      );
      expect(
        calculateNextRunAtFromSchedule({ schedule, startDate: runAt, previousRunAt: runAt })
      ).toEqual(new Date('2026-08-10T17:13:00.000Z').getTime());
    });
  });

  describe('getRRuleScheduleDurationMs', () => {
    test('returns the gap after runAt for an hourly rrule', () => {
      expect(
        getRRuleScheduleDurationMs(
          { freq: 4, interval: 1, tzid: 'UTC', byminute: [13] },
          new Date('2026-08-10T16:13:00.000Z')
        )
      ).toEqual(60 * 60 * 1000);
    });

    test('returns the gap after runAt for a daily rrule', () => {
      expect(
        getRRuleScheduleDurationMs(
          { freq: 3, interval: 1, tzid: 'UTC', byhour: [12], byminute: [15] },
          new Date('2026-08-10T12:15:00.000Z')
        )
      ).toEqual(24 * 60 * 60 * 1000);
    });

    test('returns the gap after runAt for a nonuniform rrule', () => {
      const rrule: RruleSchedule['rrule'] = { freq: 4, interval: 1, tzid: 'UTC', byminute: [0, 5] };

      expect(getRRuleScheduleDurationMs(rrule, new Date('2026-08-10T16:05:00.000Z'))).toEqual(
        55 * 60 * 1000
      );
      expect(getRRuleScheduleDurationMs(rrule, new Date('2026-08-10T17:00:00.000Z'))).toEqual(
        5 * 60 * 1000
      );
    });

    test('throws when the rrule has no occurrence after runAt', () => {
      expect(() =>
        getRRuleScheduleDurationMs(
          { freq: 4, interval: 1, tzid: 'UTC', byminute: [13], count: 1 } as RruleSchedule['rrule'],
          new Date('2026-08-10T16:13:00.000Z')
        )
      ).toThrow('Unable to determine the schedule duration');
    });
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
