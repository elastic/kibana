/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger } from '../test_utils';
import { getFirstRunAt } from './get_first_run_at';

describe('getFirstRunAt', () => {
  const logger = mockLogger();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-04-15T13:01:02Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test('should return runAt when provided', () => {
    const runAt = new Date(Date.now() + 3000);
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      runAt,
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    expect(firstRunAt).toEqual(runAt.toISOString());
  });

  test('should return now when there is neither runAt nor rrule provided ', () => {
    const now = new Date();
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    expect(firstRunAt).toEqual(now.toISOString());
  });

  test('should return now when an rrule with simple interval is provided ', () => {
    const now = new Date();
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 3,
          interval: 1,
          tzid: 'UTC',
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    expect(firstRunAt).toEqual(now.toISOString());
  });

  test('should return now when a simple interval is provided ', () => {
    const now = new Date();
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',

      schedule: {
        interval: '1m',
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    expect(firstRunAt).toEqual(now.toISOString());
  });

  test('should return the calculated runAt when an rrule with fixed time is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          byhour: [12],
          byminute: [15],
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next day from 2025-04-15 is 2025-04-16
    // The time is set to 12:15
    expect(firstRunAtDate).toEqual(new Date('2025-04-16T12:15:00Z'));
  });

  test('should return the calculated runAt from fixed dtstart when an rrule with fixed time and dtstart is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          dtstart: '2025-06-15T13:01:02Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          byhour: [12],
          byminute: [15],
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next day from 2025-06-15 is 2025-06-16
    // The time is set to 12:15
    expect(firstRunAtDate).toEqual(new Date('2025-06-16T12:15:02.000Z'));
  });

  test('should return the calculated runAt from now if using fixed dtstart calculates runAt in the past', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          dtstart: '2025-03-10T13:01:02Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          byhour: [12],
          byminute: [15],
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next day from 2025-03-10 is 2025-03-11 which is in the past so the first runAt is set
    // based on now which is fixed to '2025-04-15T13:01:02Z'
    // The time is set to 12:15
    expect(firstRunAtDate).toEqual(new Date('2025-04-16T12:15:02Z'));
  });

  test('should return the dtstart as the calculated runAt when dtstart is provided with no other fields', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          dtstart: '2025-06-15T13:01:02Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    expect(firstRunAtDate).toEqual(new Date('2025-06-15T13:01:02.000Z'));
  });

  test('should return the now as the calculated runAt when dtstart is provided but is in the past', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          dtstart: '2025-03-10T13:01:02Z',
          freq: 3,
          interval: 1,
          tzid: 'UTC',
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    expect(firstRunAtDate).toEqual(new Date('2025-04-15T13:01:02.000Z'));
  });

  test('should return the calculated runAt when an rrule with only byhour is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          byhour: [12],
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next day from 2025-04-15 is 2025-04-16
    // The hour is set to 12, default minute and second becomes 0
    expect(firstRunAtDate).toEqual(new Date('2025-04-16T12:00:00Z'));
  });

  test('should return the calculated runAt when an rrule with byminute is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 3,
          interval: 1,
          tzid: 'UTC',
          byminute: [17],
        },
      },
    };
    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The minute is set to 17, default second is 0, hour becomes the current hour
    expect(firstRunAtDate).toEqual(new Date('2025-04-15T13:17:00Z'));
  });

  test('should return the calculated runAt when an rrule only with weekly interval time is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 2, // Weekly
          interval: 1,
          tzid: 'UTC',
          byweekday: ['1'], // Monday
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next Monday from 2025-04-15 is 2025-04-21
    // The time is set to midnight
    expect(firstRunAtDate).toEqual(new Date('2025-04-21T00:00:00.000Z'));
  });

  test('should return the calculated runAt when an rrule with weekly fixed time interval time is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 2, // Weekly
          interval: 1,
          tzid: 'UTC',
          byweekday: ['MO'], // Monday
          byhour: [12],
          byminute: [15],
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next Monday from 2025-04-15 is 2025-04-21
    // The time is set to 12:15
    expect(firstRunAtDate).toEqual(new Date('2025-04-21T12:15:00.000Z'));
  });

  test('should return the calculated runAt when an rrule only with monthly interval is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 1, // Monthly
          interval: 1,
          tzid: 'UTC',
          bymonthday: [3],
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next month from 2025-04 is 2025-05
    // The day is set to 3
    // The time is set to midnight
    expect(firstRunAtDate).toEqual(new Date('2025-05-03T00:00:00.000Z'));
  });

  test('should return the calculated runAt when an rrule with monthly interval with fixed time is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 1, // Monthly
          interval: 1,
          tzid: 'UTC',
          bymonthday: [3],
          byhour: [12],
          byminute: [17],
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);
    // The next month from 2025-04 is 2025-05
    // The day is set to 3
    // The time is set to 12:17:00
    expect(firstRunAtDate).toEqual(new Date('2025-05-03T12:17:00.000Z'));
  });

  test('should return the calculated runAt when an rrule with monthly interval with weekday is provided', () => {
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 1, // Monthly
          interval: 1,
          tzid: 'UTC',
          byweekday: ['3'], // Wednesday
          byhour: [12],
          byminute: [17],
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);

    // The next occurence is in the same month and is 2025-04-16
    // The time is set to 12:17
    expect(firstRunAtDate).toEqual(new Date('2025-04-16T12:17:00.000Z'));
  });

  test('should log an error and return now if rrule fails', () => {
    const now = new Date();
    const taskInstance = {
      id: 'id',
      params: {},
      state: {},
      taskType: 'report',
      schedule: {
        rrule: {
          freq: 3,
          interval: 1,
          tzid: 'invalid-timezone',
          bymonthday: [1],
        },
      },
    };

    const firstRunAt = getFirstRunAt({ taskInstance, logger });
    const firstRunAtDate = new Date(firstRunAt);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('runAt for the rrule with fixed time could not be calculated')
    );
    expect(firstRunAtDate).toEqual(now);
  });
});
