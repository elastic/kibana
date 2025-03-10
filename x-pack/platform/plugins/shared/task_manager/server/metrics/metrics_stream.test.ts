/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { take, bufferCount } from 'rxjs';
import { createMetricsStream } from './metrics_stream';
import { JsonValue } from '@kbn/utility-types';
import { AggregatedStat } from '../lib/runtime_statistics_aggregator';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createMetricsStream', () => {
  it('incrementally updates the metrics returned by the endpoint', async () => {
    const aggregatedStats$ = new Subject<AggregatedStat>();

    return new Promise<void>((resolve) => {
      createMetricsStream(aggregatedStats$)
        .pipe(take(3), bufferCount(3))
        .subscribe(([initialValue, secondValue, thirdValue]) => {
          expect(initialValue.metrics).toMatchObject({
            lastUpdate: expect.any(String),
            metrics: {},
          });

          expect(secondValue).toMatchObject({
            lastUpdate: expect.any(String),
            metrics: {
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
            },
          });

          expect(thirdValue).toMatchObject({
            lastUpdate: expect.any(String),
            metrics: {
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
