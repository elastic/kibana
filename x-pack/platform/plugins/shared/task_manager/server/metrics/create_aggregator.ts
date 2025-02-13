/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, filter, interval, map, merge, Observable, startWith } from 'rxjs';
import { JsonValue } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { TaskManagerConfig } from '../config';
import { ITaskMetricsAggregator } from './types';
import { TaskLifecycleEvent } from '../polling_lifecycle';

export interface CreateMetricsAggregatorOpts<T> {
  key: string;
  config: TaskManagerConfig;
  logger?: Logger;
  reset$?: Observable<boolean>;
  events$: Observable<TaskLifecycleEvent>;
  eventFilter: (event: TaskLifecycleEvent) => boolean;
  metricsAggregator: ITaskMetricsAggregator<T>;
}

export function createAggregator<T extends JsonValue>({
  key,
  config,
  reset$,
  logger,
  events$,
  eventFilter,
  metricsAggregator,
}: CreateMetricsAggregatorOpts<T>): AggregatedStatProvider<T> {
  if (reset$) {
    let lastResetTime: Date = new Date();
    // Resets the aggregators either when the reset interval has passed or
    // a reset$ event is received
    merge(
      interval(config.metrics_reset_interval).pipe(
        map(() => {
          if (intervalHasPassedSince(lastResetTime, config.metrics_reset_interval)) {
            lastResetTime = new Date();
            if (logger) {
              logger.debug(
                `Resetting metrics due to reset interval expiration - ${lastResetTime.toISOString()}`
              );
            }
            return true;
          }

          return false;
        })
      ),
      reset$.pipe(
        map((value: boolean) => {
          // keep track of the last time we reset due to collection
          lastResetTime = new Date();
          if (logger) {
            logger.debug(`Resetting metrics due to collection - ${lastResetTime.toISOString()}`);
          }
          return true;
        })
      )
    ).subscribe((shouldReset: boolean) => {
      if (shouldReset) {
        metricsAggregator.reset();
      }
    });
  }

  const taskEvents$: Observable<T> = events$.pipe(
    filter((event: TaskLifecycleEvent) => eventFilter(event)),
    map((event: TaskLifecycleEvent) => {
      metricsAggregator.processTaskLifecycleEvent(event);
      return metricsAggregator.collect();
    })
  );

  return combineLatest([taskEvents$.pipe(startWith(metricsAggregator.initialMetric()))]).pipe(
    map(([value]: [T]) => {
      return {
        key,
        value,
      } as AggregatedStat<T>;
    })
  );
}

function intervalHasPassedSince(date: Date, intervalInMs: number) {
  const now = new Date().valueOf();
  return now - date.valueOf() > intervalInMs;
}
