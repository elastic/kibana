/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rewriteActionsReq, rewriteSystemActionsReq } from './rewrite_actions';

describe('rewriteActionsReq', () => {
  it('should rewrite actions correctly', () => {
    expect(
      rewriteActionsReq([
        {
          uuid: '111',
          group: 'default',
          id: '1',
          params: { foo: 'bar' },
          frequency: {
            summary: true,
            notify_when: 'onThrottleInterval',
            throttle: '1h',
          },
          alerts_filter: {
            query: {
              kql: 'test:1s',
              dsl: '{test:1}',
              filters: [],
            },
            timeframe: {
              days: [1, 2, 3],
              timezone: 'UTC',
              hours: {
                start: '00:00',
                end: '15:00',
              },
            },
          },
        },
      ])
    ).toEqual([
      {
        uuid: '111',
        group: 'default',
        id: '1',
        params: { foo: 'bar' },
        frequency: {
          summary: true,
          notifyWhen: 'onThrottleInterval',
          throttle: '1h',
        },
        alertsFilter: {
          query: {
            kql: 'test:1s',
            dsl: '{test:1}',
            filters: [],
          },
          timeframe: {
            days: [1, 2, 3],
            timezone: 'UTC',
            hours: {
              start: '00:00',
              end: '15:00',
            },
          },
        },
      },
    ]);
  });
});

describe('rewriteSystemActionsReq', () => {
  it('should rewrite system actions correctly', () => {
    expect(
      rewriteSystemActionsReq([
        {
          uuid: '111',
          id: 'system-1',
          params: { foo: 'bar' },
        },
      ])
    ).toEqual([
      {
        uuid: '111',
        id: 'system-1',
        params: { foo: 'bar' },
      },
    ]);
  });
});
