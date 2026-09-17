/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAnomalyAlertTimeFilter } from './utils';

describe('buildAnomalyAlertTimeFilter', () => {
  const lookbackInterval = '32m';

  const startedAt = new Date('2024-06-01T12:01:00.000Z');

  test('uses timestamp lookback when lastRunTime is null', () => {
    expect(
      buildAnomalyAlertTimeFilter({
        lastRunTime: null,
        startedAt,
        lookbackInterval,
      })
    ).toEqual({
      range: {
        timestamp: {
          gte: 'now-32m',
          lte: 'now',
        },
      },
    });
  });

  test('prefers event.ingested since lastRunTime with timestamp lookback backup', () => {
    const lastRunTime = new Date('2024-06-01T12:00:00.000Z');

    expect(
      buildAnomalyAlertTimeFilter({
        lastRunTime,
        startedAt,
        lookbackInterval,
      })
    ).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { exists: { field: 'event.ingested' } },
                {
                  range: {
                    'event.ingested': {
                      gte: '2024-06-01T12:00:00.000Z',
                      lt: '2024-06-01T12:01:00.000Z',
                    },
                  },
                },
              ],
            },
          },
          {
            bool: {
              must_not: { exists: { field: 'event.ingested' } },
              filter: {
                range: {
                  timestamp: {
                    gte: 'now-32m',
                    lte: 'now',
                  },
                },
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });
});
