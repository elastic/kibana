/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { Logger } from '@kbn/logging';
import type { MonitoredHealth } from '../routes/health';
import type { TaskManagerUsage } from './types';
import type { MonitoredUtilization } from '../routes/background_task_utilization';
import type { BackgroundTaskUtilizationStat } from '../monitoring/background_task_utilization_statistics';
import type { MonitoredStat } from '../monitoring/monitoring_stats_stream';
import type { TaskManagerStartContract } from '..';
import type { LatestTaskStateSchema } from './task_state';
import { TASK_ID } from './constants';

type GetTaskManagerStart = () => Promise<TaskManagerStartContract>;

const EMPTY_PERCENTILES = { p50: null, p75: null, p95: null, p99: null };

/**
 * Reads the state accumulated by the snapshot telemetry task. Returns null when the task has not
 * run yet so the collector can still report the in-memory stats.
 */
async function getLatestTaskState(
  getTaskManagerStart: GetTaskManagerStart,
  logger: Logger
): Promise<LatestTaskStateSchema | null> {
  try {
    const taskManager = await getTaskManagerStart();
    const doc = await taskManager.get(TASK_ID);
    return (doc.state ?? null) as LatestTaskStateSchema | null;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service can fetch from this collector before Task Manager has been initialized,
      because Task Manager waits for all plugins to initialize first. It's fine to ignore, the next
      collection will pick the state up.
    */
    if (!errMessage.includes('NotInitialized')) {
      logger.debug(`Error reading ${TASK_ID} task state for telemetry: ${errMessage}`);
    }
    return null;
  }
}

export function createTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[],
  getTaskManagerStart: GetTaskManagerStart,
  logger: Logger
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
      const eventLogState = await getLatestTaskState(getTaskManagerStart, logger);

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
        configured_capacity: lastMonitoredHealth?.stats.configuration?.value.capacity.config ?? 0,
        total_task_runs_24hr: eventLogState?.total_task_runs_24hr ?? 0,
        task_runs_by_type_24hr: eventLogState?.task_runs_by_type_24hr ?? [],
        task_runs_other_24hr: eventLogState?.task_runs_other_24hr ?? 0,
        schedule_delay_ms_24hr: eventLogState?.schedule_delay_ms_24hr ?? EMPTY_PERCENTILES,
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
      configured_capacity: {
        type: 'long',
        _meta: { description: 'The number of normal cost tasks this Kibana runs simultaneously' },
      },
      total_task_runs_24hr: {
        type: 'long',
        _meta: {
          description:
            'Total number of task runs started across the cluster in the last 24 hours, from the event log',
        },
      },
      task_runs_by_type_24hr: {
        type: 'array',
        items: {
          name: { type: 'keyword', _meta: { description: 'The task type' } },
          value: {
            type: 'long',
            _meta: {
              description: 'Number of runs started for this task type in the last 24 hours',
            },
          },
        },
      },
      task_runs_other_24hr: {
        type: 'long',
        _meta: {
          description:
            'Number of runs started in the last 24 hours belonging to task types outside the task_runs_by_type_24hr breakdown, which is capped to the highest volume task types',
        },
      },
      schedule_delay_ms_24hr: {
        p50: {
          type: 'long',
          _meta: { description: '50th percentile of task schedule delay in ms over 24 hours' },
        },
        p75: {
          type: 'long',
          _meta: { description: '75th percentile of task schedule delay in ms over 24 hours' },
        },
        p95: {
          type: 'long',
          _meta: { description: '95th percentile of task schedule delay in ms over 24 hours' },
        },
        p99: {
          type: 'long',
          _meta: { description: '99th percentile of task schedule delay in ms over 24 hours' },
        },
      },
    },
  });
}

export function registerTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[],
  getTaskManagerStart: GetTaskManagerStart,
  logger: Logger
) {
  const collector = createTaskManagerUsageCollector(
    usageCollection,
    monitoringStats$,
    monitoredUtilization$,
    excludeTaskTypes,
    getTaskManagerStart,
    logger
  );
  usageCollection.registerCollector(collector);
}
