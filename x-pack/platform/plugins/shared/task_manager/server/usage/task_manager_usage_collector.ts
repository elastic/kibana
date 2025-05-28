/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MonitoredHealth } from '../routes/health';
import type { TaskManagerUsage } from './types';
import type { MonitoredUtilization } from '../routes/background_task_utilization';
import type { BackgroundTaskUtilizationStat } from '../monitoring/background_task_utilization_statistics';
import type { MonitoredStat } from '../monitoring/monitoring_stats_stream';

export function createTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[]
) {
  let lastMonitoredHealth: MonitoredHealth | null = null;
  let lastMonitoredUtilizationStats: MonitoredStat<BackgroundTaskUtilizationStat> | null = null;
  combineLatest([monitoringStats$, monitoredUtilization$])
    .pipe()
    .subscribe(([health, utilization]) => {
      lastMonitoredHealth = health;
      lastMonitoredUtilizationStats =
        (utilization?.stats as MonitoredStat<BackgroundTaskUtilizationStat>) ?? null;
    });

  return usageCollection.makeUsageCollector<TaskManagerUsage>({
    type: 'task_manager',
    isReady: async () => {
      return Boolean(lastMonitoredHealth);
    },
    fetch: async () => {
      return {
        task_type_exclusion: excludeTaskTypes,
        failed_tasks: Object.entries(lastMonitoredHealth?.stats.workload?.value.task_types!).reduce(
          (numb, [key, val]) => {
            if (val.status.failed !== undefined) {
              numb += val.status.failed;
            }
            return numb;
          },
          0
        ),
        recurring_tasks: {
          actual_service_time:
            lastMonitoredUtilizationStats?.value.recurring.ran.service_time.actual ?? 0,
          adjusted_service_time:
            lastMonitoredUtilizationStats?.value.recurring.ran.service_time.adjusted ?? 0,
        },
        adhoc_tasks: {
          actual_service_time:
            lastMonitoredUtilizationStats?.value.adhoc.ran.service_time.actual ?? 0,
          adjusted_service_time:
            lastMonitoredUtilizationStats?.value.adhoc.ran.service_time.adjusted ?? 0,
        },
        capacity:
          lastMonitoredHealth?.stats.capacity_estimation?.value.observed
            .max_throughput_per_minute_per_kibana ?? 0,
      };
    },
    schema: {
      task_type_exclusion: { type: 'array', items: { type: 'keyword' } },
      failed_tasks: { type: 'long' },
      recurring_tasks: {
        actual_service_time: { type: 'long' },
        adjusted_service_time: { type: 'long' },
      },
      adhoc_tasks: {
        actual_service_time: { type: 'long' },
        adjusted_service_time: { type: 'long' },
      },
      capacity: { type: 'long' },
    },
  });
}

export function registerTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[]
) {
  const collector = createTaskManagerUsageCollector(
    usageCollection,
    monitoringStats$,
    monitoredUtilization$,
    excludeTaskTypes
  );
  usageCollection.registerCollector(collector);
}
