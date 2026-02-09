/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaintenanceWindowExpirationDate } from './get_maintenance_window_expiration_date';

describe('getMaintenanceWindowExpirationDate', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-25T00:30:00.000Z'));
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('should return +1 year expiration date', () => {
    const result = getMaintenanceWindowExpirationDate({
      schedule: {
        start: '2023-03-25T01:00:00.000Z',
        duration: '1h',
        recurring: {
          every: '1w',
          onWeekDay: ['MO', 'FR'],
        },
      },
    });
    expect(result).toEqual('2024-03-25T00:30:00.000Z');
  });

  it('should return expiration date based on duration', () => {
    const result = getMaintenanceWindowExpirationDate({
      schedule: {
        start: '2023-03-25T09:00:00.000Z',
        duration: '1h',
      },
    });
    expect(result).toEqual('2023-03-25T10:00:00.000Z');
  });
});
