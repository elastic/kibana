/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { merge, of } from 'rxjs';
import { map, scan } from 'rxjs';
import { set } from '@kbn/safer-lodash-set';
import type { Logger } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import type { SummarizedWorkloadStat, WorkloadStat } from './workload_statistics';
import { createWorkloadAggregator, summarizeWorkloadStat } from './workload_statistics';
import type { TaskRunStat, SummarizedTaskRunStat } from './task_run_statistics';
import type { EphemeralTaskStat, SummarizedEphemeralTaskStat } from './ephemeral_task_statistics';
import { createEphemeralTaskAggregator, summarizeEphemeralStat } from './ephemeral_task_statistics';
import { createTaskRunAggregator, summarizeTaskRunStat } from './task_run_statistics';
import type { BackgroundTaskUtilizationStat } from './background_task_utilization_statistics';
import { createBackgroundTaskUtilizationAggregator } from './background_task_utilization_statistics';

import type { ConfigStat } from './configuration_statistics';
import { createConfigurationAggregator } from './configuration_statistics';
import type { TaskManagerConfig } from '../config';
import type { CapacityEstimationStat } from './capacity_estimation';
import { withCapacityEstimate } from './capacity_estimation';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import type { CreateMonitoringStatsOpts } from '.';

export interface MonitoringStats {
  last_update: string;
  stats: {
    configuration?: MonitoredStat<ConfigStat>;
    workload?: MonitoredStat<WorkloadStat>;
    runtime?: MonitoredStat<TaskRunStat>;
    ephemeral?: MonitoredStat<EphemeralTaskStat>;
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
    ephemeral?: RawMonitoredStat<SummarizedEphemeralTaskStat>;
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
  ephemeralTaskLifecycle,
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
  if (ephemeralTaskLifecycle && ephemeralTaskLifecycle.enabled) {
    aggregators.push(
      createEphemeralTaskAggregator(
        ephemeralTaskLifecycle,
        config.monitored_stats_running_average_window,
        startingCapacity
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
    stats: { runtime, workload, configuration, ephemeral, utilization },
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
      ...(ephemeral
        ? {
            ephemeral: {
              timestamp: ephemeral.timestamp,
              ...summarizeEphemeralStat(ephemeral.value),
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
