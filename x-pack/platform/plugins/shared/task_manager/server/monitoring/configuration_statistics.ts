/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineLatest, of } from 'rxjs';
import { pick, merge } from 'lodash';
import { map, startWith } from 'rxjs';
import type { JsonObject } from '@kbn/utility-types';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskManagerConfig } from '../config';
import { AUTO_CAPACITY, CLAIM_STRATEGY_MGET } from '../config';
import type { AdaptiveCapacityState } from '../lib/adaptive_capacity';
import { getCapacityInCost, getCapacityInWorkers } from '../task_pool';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskExecutionControlService, TaskExecutionControlState } from '../execution_control';

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
    /** `auto` when the heap controller sizes capacity; absent only in older fixtures. */
    mode?: 'fixed' | 'auto';
  };
}

interface AdaptiveCapacityConfig extends JsonObject {
  /** Latest heap controller decision; `null` with a fixed capacity. */
  adaptive_capacity: AdaptiveCapacityState | null;
}

interface ExecutionControlConfig extends JsonObject {
  execution_control: {
    paused: boolean;
    paused_task_types: string[];
  };
}

export type ConfigStat = Pick<
  TaskManagerConfig,
  'poll_interval' | 'claim_strategy' | (typeof CONFIG_FIELDS_TO_EXPOSE)[number]
> &
  CapacityConfig &
  AdaptiveCapacityConfig &
  ExecutionControlConfig;

export function createConfigurationAggregator(
  config: TaskManagerConfig,
  startingCapacity: number,
  taskPollingLifecycle?: TaskPollingLifecycle,
  executionControlService?: TaskExecutionControlService
): AggregatedStatProvider<ConfigStat> {
  const mode = config.capacity === AUTO_CAPACITY ? 'auto' : 'fixed';
  const capacity$ = taskPollingLifecycle
    ? taskPollingLifecycle.capacityConfiguration$.pipe(
        startWith(startingCapacity),
        map<number, CapacityConfig>((capacity) => ({
          capacity: {
            config: capacity,
            as_workers: getCapacityInWorkers(capacity),
            as_cost: getCapacityInCost(capacity),
            mode,
          },
        }))
      )
    : of<CapacityConfig>({
        capacity: {
          config: startingCapacity,
          as_workers: getCapacityInWorkers(startingCapacity),
          as_cost: getCapacityInCost(startingCapacity),
          mode,
        },
      });

  const adaptiveCapacity$ = taskPollingLifecycle?.adaptiveCapacityState$
    ? taskPollingLifecycle.adaptiveCapacityState$.pipe(
        map<AdaptiveCapacityState, AdaptiveCapacityConfig>((state) => ({
          adaptive_capacity: state,
        }))
      )
    : of<AdaptiveCapacityConfig>({ adaptive_capacity: null });

  // The execution control service runs on every node (including UI-only nodes
  // that have no polling lifecycle), so read the pause state from it directly
  // to keep the health output consistent everywhere.
  const executionControl$ = executionControlService
    ? executionControlService.state.pipe(
        map<TaskExecutionControlState, ExecutionControlConfig>((state) => ({
          execution_control: {
            paused: state.paused,
            paused_task_types: state.pausedTaskTypes,
          },
        }))
      )
    : of<ExecutionControlConfig>({
        execution_control: { paused: false, paused_task_types: [] },
      });

  return combineLatest([
    of(pick(config, ...CONFIG_FIELDS_TO_EXPOSE)),
    of({ claim_strategy: config.claim_strategy ?? CLAIM_STRATEGY_MGET }),
    of({ poll_interval: config.poll_interval }),
    capacity$,
    adaptiveCapacity$,
    executionControl$,
  ]).pipe(
    map((configurations) => ({
      key: 'configuration',
      value: merge({}, ...configurations),
    }))
  );
}
