/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformUpdateBody } from './v1';

describe('transformUpdateBody', () => {
  it('transforms every field correctly', () => {
    expect(
      transformUpdateBody({
        title: 'test-update-maintenance-window',
        enabled: true,
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
      title: 'test-update-maintenance-window',
      duration: 864000000,
      enabled: true,
      rRule: {
        bymonth: undefined,
        bymonthday: undefined,
        byweekday: ['MO', 'FR'],
        count: undefined,
        dtstart: '2021-03-07T00:00:00.000Z',
        freq: 3,
        interval: 1,
        tzid: 'UTC',
        until: '2022-05-17T05:05:00.000Z',
      },
      scopedQuery: {
        filters: [],
        kql: "_id: '1234'",
      },
    });
  });

  it('does not include missing fields', () => {
    expect(transformUpdateBody({})).toEqual({});
  });

  it('sets correctly enabled: false', () => {
    expect(transformUpdateBody({ enabled: false })).toEqual({ enabled: false });
  });
});
