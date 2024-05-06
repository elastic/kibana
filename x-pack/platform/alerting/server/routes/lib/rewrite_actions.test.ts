/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rewriteActionsReq, rewriteActionsRes } from './rewrite_actions';

describe('rewrite Actions', () => {
  describe('rewriteActionsRes', () => {
    it('rewrites the actions response correctly', () => {
      expect(
        rewriteActionsRes([
          {
            uuid: '111',
            group: 'default',
            id: '1',
            actionTypeId: '2',
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
        ])
      ).toEqual([
        {
          alerts_filter: {
            query: { dsl: '{test:1}', kql: 'test:1s', filters: [] },
            timeframe: {
              days: [1, 2, 3],
              hours: { end: '15:00', start: '00:00' },
              timezone: 'UTC',
            },
          },
          connector_type_id: '2',
          frequency: { notify_when: 'onThrottleInterval', summary: true, throttle: '1h' },
          group: 'default',
          id: '1',
          params: { foo: 'bar' },
          uuid: '111',
        },
      ]);
    });
  });

  describe('rewriteActionsReq', () => {
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
