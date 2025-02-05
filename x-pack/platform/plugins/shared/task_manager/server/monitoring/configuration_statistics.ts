/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, of } from 'rxjs';
import { pick, merge } from 'lodash';
import { map, startWith } from 'rxjs';
import { JsonObject } from '@kbn/utility-types';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { CLAIM_STRATEGY_UPDATE_BY_QUERY, TaskManagerConfig } from '../config';
import { getCapacityInCost, getCapacityInWorkers } from '../task_pool';
import { TaskPollingLifecycle } from '../polling_lifecycle';

const CONFIG_FIELDS_TO_EXPOSE = [
  'request_capacity',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
  'monitored_task_execution_thresholds',
] as const;

interface CapacityConfig extends JsonObject {
  capacity: {
    config: number;
    as_workers: number;
    as_cost: number;
  };
}

export type ConfigStat = Pick<
  TaskManagerConfig,
  'poll_interval' | 'claim_strategy' | (typeof CONFIG_FIELDS_TO_EXPOSE)[number]
> &
  CapacityConfig;

export function createConfigurationAggregator(
  config: TaskManagerConfig,
  startingCapacity: number,
  taskPollingLifecycle?: TaskPollingLifecycle
): AggregatedStatProvider<ConfigStat> {
  const capacity$ = taskPollingLifecycle
    ? taskPollingLifecycle.capacityConfiguration$.pipe(
        startWith(startingCapacity),
        map<number, CapacityConfig>((capacity) => ({
          capacity: {
            config: capacity,
            as_workers: getCapacityInWorkers(capacity),
            as_cost: getCapacityInCost(capacity),
          },
        }))
      )
    : of({
        capacity: {
          config: startingCapacity,
          as_workers: getCapacityInWorkers(startingCapacity),
          as_cost: getCapacityInCost(startingCapacity),
        },
      });

  return combineLatest([
    of(pick(config, ...CONFIG_FIELDS_TO_EXPOSE)),
    of({ claim_strategy: config.claim_strategy ?? CLAIM_STRATEGY_UPDATE_BY_QUERY }),
    of({ poll_interval: config.poll_interval }),
    capacity$,
  ]).pipe(
    map((configurations) => ({
      key: 'configuration',
      value: merge({}, ...configurations),
    }))
  );
}
