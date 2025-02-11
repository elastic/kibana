/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, of, Observable } from 'rxjs';
import { map, scan } from 'rxjs';
import { set } from '@kbn/safer-lodash-set';
import { Logger } from '@kbn/core/server';
import { JsonObject } from '@kbn/utility-types';
import {
  createWorkloadAggregator,
  summarizeWorkloadStat,
  SummarizedWorkloadStat,
  WorkloadStat,
} from './workload_statistics';
import {
  createTaskRunAggregator,
  summarizeTaskRunStat,
  TaskRunStat,
  SummarizedTaskRunStat,
} from './task_run_statistics';
import {
  BackgroundTaskUtilizationStat,
  createBackgroundTaskUtilizationAggregator,
} from './background_task_utilization_statistics';

import { ConfigStat, createConfigurationAggregator } from './configuration_statistics';
import { TaskManagerConfig } from '../config';
import { CapacityEstimationStat, withCapacityEstimate } from './capacity_estimation';
import { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { CreateMonitoringStatsOpts } from '.';

export interface MonitoringStats {
  last_update: string;
  stats: {
    configuration?: MonitoredStat<ConfigStat>;
    workload?: MonitoredStat<WorkloadStat>;
    runtime?: MonitoredStat<TaskRunStat>;
    utilization?: MonitoredStat<BackgroundTaskUtilizationStat>;
  };
}

export enum HealthStatus {
  Uninitialized = 'uninitialized',
  OK = 'OK',
  Warning = 'warn',
  Error = 'error',
}

export interface MonitoredStat<T> {
  timestamp: string;
  value: T;
}
export type RawMonitoredStat<T extends JsonObject> = MonitoredStat<T> & {
  status: HealthStatus;
  reason?: string;
};

export interface RawMonitoringStats {
  last_update: string;
  stats: {
    configuration?: RawMonitoredStat<ConfigStat>;
    workload?: RawMonitoredStat<SummarizedWorkloadStat>;
    runtime?: RawMonitoredStat<SummarizedTaskRunStat>;
    capacity_estimation?: RawMonitoredStat<CapacityEstimationStat>;
  };
}

export function createAggregators({
  taskStore,
  elasticsearchAndSOAvailability$,
  config,
  logger,
  taskDefinitions,
  adHocTaskCounter,
  startingCapacity,
  taskPollingLifecycle,
}: CreateMonitoringStatsOpts): AggregatedStatProvider {
  const aggregators: AggregatedStatProvider[] = [
    createConfigurationAggregator(config, startingCapacity, taskPollingLifecycle),

    createWorkloadAggregator({
      taskStore,
      elasticsearchAndSOAvailability$,
      refreshInterval: config.monitored_aggregated_stats_refresh_rate,
      pollInterval: config.poll_interval,
      logger,
      taskDefinitions,
    }),
  ];
  if (taskPollingLifecycle) {
    aggregators.push(
      createTaskRunAggregator(taskPollingLifecycle, config.monitored_stats_running_average_window),
      createBackgroundTaskUtilizationAggregator(
        taskPollingLifecycle,
        adHocTaskCounter,
        config.poll_interval,
        config.worker_utilization_running_average_window
      )
    );
  }
  return merge(...aggregators);
}

export function createMonitoringStatsStream(
  provider$: AggregatedStatProvider
): Observable<MonitoringStats> {
  const initialStats = {
    last_update: new Date().toISOString(),
    stats: {},
  };
  return merge(
    // emit the initial stats
    of(initialStats),
    // emit updated stats whenever a provider updates a specific key on the stats
    provider$.pipe(
      map(({ key, value }) => {
        return {
          value: { timestamp: new Date().toISOString(), value },
          key,
        };
      }),
      scan((monitoringStats: MonitoringStats, { key, value }) => {
        // incrementally merge stats as they come in
        set(monitoringStats.stats, key, value);
        monitoringStats.last_update = new Date().toISOString();
        return monitoringStats;
      }, initialStats)
    )
  );
}

export function summarizeMonitoringStats(
  logger: Logger,
  {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    last_update,
    stats: { runtime, workload, configuration, utilization },
  }: MonitoringStats,
  config: TaskManagerConfig,
  assumedKibanaInstances: number
): RawMonitoringStats {
  const summarizedStats = withCapacityEstimate(
    logger,
    {
      ...(configuration
        ? {
            configuration: {
              ...configuration,
              status: HealthStatus.OK,
            },
          }
        : {}),
      ...(runtime
        ? {
            runtime: {
              timestamp: runtime.timestamp,
              ...summarizeTaskRunStat(logger, runtime.value, config),
            },
          }
        : {}),
      ...(workload
        ? {
            workload: {
              timestamp: workload.timestamp,
              ...summarizeWorkloadStat(workload.value),
            },
          }
        : {}),
    },
    assumedKibanaInstances
  );

  return {
    last_update,
    stats: summarizedStats,
  };
}
