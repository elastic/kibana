/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformCreateBody } from './v1';

describe('transformCreateBody', () => {
  it('transforms every field correctly', () => {
    expect(
      transformCreateBody({
        title: 'test-maintenance-window',
        enabled: false,
        schedule: {
          custom: {
            duration: '10d',
            start: '2021-03-07T00:00:00.000Z',
            recurring: { every: '1d', end: '2022-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
          },
        },
        scope: {
          alerting: {
            query: {
              kql: "_id: '1234'",
            },
          },
        },
      })
    ).toEqual({
      title: 'test-maintenance-window',
      enabled: false,
      scopedQuery: {
        filters: [],
        kql: "_id: '1234'",
      },
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
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          recurring: { every: '1d', end: '2022-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
        },
      },
      scope: {
        alerting: {
          filters: [],
          kql: "_id: '1234'",
        },
      },
    });
  });

  it('transform excludes scopedQuery if scope is missing', () => {
    expect(
      transformCreateBody({
        title: 'test-maintenance-window',
        enabled: false,
        schedule: {
          custom: {
            duration: '10d',
            start: '2021-03-07T00:00:00.000Z',
            recurring: { every: '1d', end: '2022-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
          },
        },
      })
    ).toEqual({
      title: 'test-maintenance-window',
      enabled: false,
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
      schedule: {
        custom: {
          duration: '10d',
          start: '2021-03-07T00:00:00.000Z',
          recurring: { every: '1d', end: '2022-05-17T05:05:00.000Z', onWeekDay: ['MO', 'FR'] },
        },
      },
    });
  });
});
