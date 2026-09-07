/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import {
  generateMaintenanceWindowEvents,
  shouldRegenerateEvents,
} from './generate_maintenance_window_events';
import type { MaintenanceWindow } from '../types';

describe('generateMaintenanceWindowEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
  });

  it('should generate events for rrule repeating daily', () => {
    // Create rrule with expiration date at: 2023-03-13T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(2, 'weeks')
        .toISOString(),
      schedule: {
        duration: '1h',
        start: '2023-02-27T00:00:00.000Z',
        recurring: {
          every: '1d',
        },
      },
    });

    expect(result.length).toEqual(15);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (daily)
    expect(result[1].gte).toEqual('2023-02-28T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-02-28T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-03-13T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-03-13T01:00:00.000Z');
  });

  it('should generate events for rrule repeating weekly', () => {
    // Create rrule with expiration date at: 2023-04-03T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(5, 'weeks')
        .toISOString(),
      schedule: {
        duration: '1h',
        start: '2023-02-27T00:00:00.000Z',
        recurring: {
          every: '1w',
        },
      },
    });

    expect(result.length).toEqual(6);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (weekly)
    expect(result[1].gte).toEqual('2023-03-06T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-06T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-04-03T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-04-03T01:00:00.000Z');
  });

  it('should generate events for rrule repeating monthly', () => {
    // Create rrule with expiration date at: 2023-10-27T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(8, 'months')
        .toISOString(),
      schedule: {
        duration: '1h',
        start: '2023-02-27T00:00:00.000Z',
        recurring: {
          every: '1M',
        },
      },
    });

    expect(result.length).toEqual(9);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (monthly)
    expect(result[1].gte).toEqual('2023-03-27T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-27T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-10-27T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-10-27T01:00:00.000Z');
  });

  it('should generate events for rrule repeating by specific days', () => {
    const result = generateMaintenanceWindowEvents({
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(5, 'weeks')
        .toISOString(),
      schedule: {
        duration: '1h',
        start: '2023-02-27T00:00:00.000Z',
        recurring: {
          every: '1w',
          onWeekDay: ['TU', 'TH'],
        },
      },
    });

    expect(result.length).toEqual(10); // 5 weeks x 2 times a week = 10

    // Ensure start date is correct (Tuesday)
    expect(result[0].gte).toEqual('2023-02-28T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-28T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (Thursday)
    expect(result[1].gte).toEqual('2023-03-02T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-02T01:00:00.000Z');

    // Ensure end date is correct (Thursday)
    expect(result[result.length - 1].gte).toEqual('2023-03-30T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-03-30T01:00:00.000Z');
  });

  it('should generate events starting with start date', () => {
    const result = generateMaintenanceWindowEvents({
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(5, 'weeks')
        .toISOString(),
      schedule: {
        duration: '1h',
        start: '2023-01-27T00:00:00.000Z',
        recurring: {
          every: '1w',
          onWeekDay: ['TU', 'WE', 'TH'],
        },
      },
      startDate: '2023-03-01T00:00:00.000Z',
    });

    expect(result[0].lte).toEqual('2023-03-01T01:00:00.000Z'); // events started after start date
    expect(result[0].gte).toEqual('2023-03-01T00:00:00.000Z');

    expect(result[result.length - 1].lte).toEqual('2023-03-30T01:00:00.000Z'); // events ended before expiration date
    expect(result[result.length - 1].gte).toEqual('2023-03-30T00:00:00.000Z');
  });

  describe('shouldRegenerateEvents', () => {
    it('should return true if duration has changed', () => {
      expect(
        shouldRegenerateEvents({
          maintenanceWindow: {
            id: '1',
            title: 'Test MW',
            enabled: true,
            schedule: {
              custom: {
                duration: '1h',
                start: '2023-02-27T00:00:00.000Z',
                recurring: {
                  every: '1d',
                },
              },
            },
          } as MaintenanceWindow,
          schedule: {
            duration: '2h',
            start: '2023-02-27T00:00:00.000Z',
            recurring: {
              every: '1d',
            },
          },
        })
      ).toBe(true);
    });

    it('should return true if schedule has changed', () => {
      expect(
        shouldRegenerateEvents({
          maintenanceWindow: {
            id: '1',
            title: 'Test MW',
            enabled: true,
            schedule: {
              custom: {
                duration: '1h',
                start: '2023-02-27T00:00:00.000Z',
                recurring: {
                  every: '1d',
                },
              },
            },
          } as MaintenanceWindow,
          schedule: {
            duration: '1h',
            start: '2023-02-27T00:00:00.000Z',
            recurring: {
              every: '1w',
            },
          },
        })
      ).toBe(true);
    });

    it('should return false if schedule or duration has not changed', () => {
      expect(
        shouldRegenerateEvents({
          maintenanceWindow: {
            id: '1',
            title: 'Updated test MW',
            enabled: true,
            schedule: {
              custom: {
                duration: '1h',
                start: '2023-02-27T00:00:00.000Z',
                recurring: {
                  every: '1d',
                },
              },
            },
          } as MaintenanceWindow,
          schedule: {
            duration: '1h',
            start: '2023-02-27T00:00:00.000Z',
            recurring: {
              every: '1d',
            },
          },
        })
      ).toBe(false);
    });
  });
});
