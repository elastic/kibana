/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { TaskManagerConfig } from '../config';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { TaskExecutionControlService } from '../execution_control';
declare const CONFIG_FIELDS_TO_EXPOSE: readonly [
  'request_capacity',
  'monitored_aggregated_stats_refresh_rate',
  'monitored_stats_running_average_window',
  'monitored_task_execution_thresholds'
];
interface CapacityConfig extends JsonObject {
  capacity: {
    config: number;
    as_workers: number;
    as_cost: number;
  };
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
  ExecutionControlConfig;
export declare function createConfigurationAggregator(
  config: TaskManagerConfig,
  startingCapacity: number,
  taskPollingLifecycle?: TaskPollingLifecycle,
  executionControlService?: TaskExecutionControlService
): AggregatedStatProvider<ConfigStat>;
export {};
