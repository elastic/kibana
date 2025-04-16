/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformInternalMaintenanceWindowToExternal } from './v1';

describe('transformInternalMaintenanceWindowToExternal', () => {
  it('transforms every field correctly', () => {
    expect(
      transformInternalMaintenanceWindowToExternal({
        title: 'test-maintenance-window',
        id: 'foobar',
        status: 'running',
        createdAt: '2021-03-07T00:00:00.000Z',
        createdBy: 'me',
        updatedAt: '2021-03-07T00:00:00.000Z',
        updatedBy: 'me',
        enabled: false,
        scopedQuery: {
          filters: [],
          kql: "_id: '1234'",
        },
        categoryIds: ['observability'],
        duration: 864000000,
        rRule: {
          dtstart: '2021-03-07T00:00:00.000Z',
          tzid: 'UTC',
          byweekday: ['MO', 'FR'],
          freq: 3,
          interval: 1,
          until: '2022-05-17T05:05:00.000Z',
          bymonth: undefined,
          count: undefined,
          bymonthday: undefined,
        },
        events: [],
        eventStartTime: '',
        eventEndTime: '',
        expirationDate: '',
      })
    ).toEqual({
      title: 'test-maintenance-window',
      id: 'foobar',
      enabled: false,
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          timezone: 'UTC',
          recurring: {
            every: '1d',
            end: '2022-05-17T05:05:00.000Z',
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      scope: {
        alerting: {
          query: {
            kql: "_id: '1234'",
          },
        },
      },
      created_at: '2021-03-07T00:00:00.000Z',
      created_by: 'me',
      updated_at: '2021-03-07T00:00:00.000Z',
      updated_by: 'me',
      status: 'running',
    });
  });

  it('transforms does not return scope if scopedQuery is missing', () => {
    expect(
      transformInternalMaintenanceWindowToExternal({
        title: 'test-maintenance-window',
        id: 'foobar',
        status: 'running',
        createdAt: '2021-03-07T00:00:00.000Z',
        createdBy: 'me',
        updatedAt: '2021-03-07T00:00:00.000Z',
        updatedBy: 'me',
        enabled: false,
        categoryIds: ['securitySolution'],
        duration: 864000000,
        rRule: {
          dtstart: '2021-03-07T00:00:00.000Z',
          tzid: 'UTC',
          byweekday: ['MO', 'FR'],
          freq: 3,
          interval: 1,
          until: '2022-05-17T05:05:00.000Z',
          bymonth: undefined,
          count: undefined,
          bymonthday: undefined,
        },
        events: [],
        eventStartTime: '',
        eventEndTime: '',
        expirationDate: '',
      })
    ).toEqual({
      title: 'test-maintenance-window',
      id: 'foobar',
      enabled: false,
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          timezone: 'UTC',
          recurring: {
            every: '1d',
            end: '2022-05-17T05:05:00.000Z',
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      created_at: '2021-03-07T00:00:00.000Z',
      created_by: 'me',
      updated_at: '2021-03-07T00:00:00.000Z',
      updated_by: 'me',
      status: 'running',
    });
  });
});
