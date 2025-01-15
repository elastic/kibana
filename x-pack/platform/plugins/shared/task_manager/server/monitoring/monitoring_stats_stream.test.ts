/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, Subject } from 'rxjs';
import { take, bufferCount } from 'rxjs';
import { createMonitoringStatsStream } from './monitoring_stats_stream';
import { JsonValue } from '@kbn/utility-types';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createMonitoringStatsStream', () => {
  it('returns the initial config used to configure Task Manager', async () => {
    return new Promise<void>((resolve) => {
      createMonitoringStatsStream(of())
        .pipe(take(1))
        .subscribe((firstValue) => {
          expect(firstValue.stats).toEqual({});
          resolve();
        });
    });
  });

  it('incrementally updates the stats returned by the endpoint', async () => {
    const aggregatedStats$ = new Subject<AggregatedStat>();

    return new Promise<void>((resolve) => {
      createMonitoringStatsStream(aggregatedStats$)
        .pipe(take(3), bufferCount(3))
        .subscribe(([initialValue, secondValue, thirdValue]) => {
          expect(initialValue.stats).toMatchObject({
            lastUpdate: expect.any(String),
            stats: {
              configuration: {
                value: {
                  capacity: 10,
                  poll_interval: 6000000,
                  request_capacity: 1000,
                  monitored_aggregated_stats_refresh_rate: 5000,
                  monitored_stats_running_average_window: 50,
                  monitored_task_execution_thresholds: {
                    default: {
                      error_threshold: 90,
                      warn_threshold: 80,
                    },
                    custom: {},
                  },
                },
              },
            },
          });

          expect(secondValue).toMatchObject({
            lastUpdate: expect.any(String),
            stats: {
              newAggregatedStat: {
                timestamp: expect.any(String),
                value: {
                  some: {
                    complex: {
                      value: 123,
                    },
                  },
                },
              },
              configuration: {
                timestamp: expect.any(String),
                value: {
                  capacity: 10,
                  poll_interval: 6000000,
                  request_capacity: 1000,
                  monitored_aggregated_stats_refresh_rate: 5000,
                  monitored_stats_running_average_window: 50,
                  monitored_task_execution_thresholds: {
                    default: {
                      error_threshold: 90,
                      warn_threshold: 80,
                    },
                    custom: {},
                  },
                },
              },
            },
          });

          expect(thirdValue).toMatchObject({
            lastUpdate: expect.any(String),
            stats: {
              newAggregatedStat: {
                timestamp: expect.any(String),
                value: {
                  some: {
                    updated: {
                      value: 456,
                    },
                  },
                },
              },
              configuration: {
                timestamp: expect.any(String),
                value: {
                  capacity: 10,
                  poll_interval: 6000000,
                  request_capacity: 1000,
                  monitored_aggregated_stats_refresh_rate: 5000,
                  monitored_stats_running_average_window: 50,
                  monitored_task_execution_thresholds: {
                    default: {
                      error_threshold: 90,
                      warn_threshold: 80,
                    },
                    custom: {},
                  },
                },
              },
            },
          });
        });

      aggregatedStats$.next({
        key: 'newAggregatedStat',
        value: {
          some: {
            complex: {
              value: 123,
            },
          },
        } as JsonValue,
      });

      aggregatedStats$.next({
        key: 'newAggregatedStat',
        value: {
          some: {
            updated: {
              value: 456,
            },
          },
        } as JsonValue,
      });

      resolve();
    });
  });
});
