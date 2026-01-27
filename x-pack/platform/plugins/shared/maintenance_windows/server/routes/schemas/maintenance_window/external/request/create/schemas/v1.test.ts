/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMaintenanceWindowRequestBodySchema } from './v1';

const maintenanceWindow = {
  title: 'test-maintenance-window',
  enabled: false,
  schedule: {
    custom: {
      duration: '2h',
      start: '2021-05-20T00:00:00.000Z',
      recurring: {
        every: '1d',
        onWeekDay: ['TU', 'TH'],
        onMonthDay: [1, 31],
        onMonth: [1, 3, 5, 12],
        end: '2021-05-20T00:00:00.000Z',
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
};

describe('createMaintenanceWindowRequestBodySchema', () => {
  const mockCurrentDate = new Date('2021-05-05T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(mockCurrentDate);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('validates correctly with all fields', () => {
    expect(createMaintenanceWindowRequestBodySchema.validate(maintenanceWindow))
      .toMatchInlineSnapshot(`
      Object {
        "enabled": false,
        "schedule": Object {
          "custom": Object {
            "duration": "2h",
            "recurring": Object {
              "end": "2021-05-20T00:00:00.000Z",
              "every": "1d",
              "onMonth": Array [
                1,
                3,
                5,
                12,
              ],
              "onMonthDay": Array [
                1,
                31,
              ],
              "onWeekDay": Array [
                "TU",
                "TH",
              ],
            },
            "start": "2021-05-20T00:00:00.000Z",
          },
        },
        "scope": Object {
          "alerting": Object {
            "query": Object {
              "kql": "_id: '1234'",
            },
          },
        },
        "title": "test-maintenance-window",
      }
    `);
  });
});
