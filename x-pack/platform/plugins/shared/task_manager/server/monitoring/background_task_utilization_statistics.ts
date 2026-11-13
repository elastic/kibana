/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import { get, pick } from 'lodash';
import stats from 'stats-lite';
import type { Observable } from 'rxjs';
import { combineLatest, filter, map, startWith } from 'rxjs';
import type { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { mapOk, unwrap } from '../lib/result_type';
import type { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import type { ConcreteTaskInstance } from '../task';
import type { TaskRun, TaskTiming } from '../task_events';
import {
  isTaskManagerAutoscalingEvent,
  isTaskManagerBackpressureEvent,
  isTaskManagerWorkerUtilizationStatEvent,
  isTaskRunEvent,
} from '../task_events';
import type { AutoscalingSignalSample } from '../lib/autoscaling_signal';
import type { MonitoredStat } from './monitoring_stats_stream';
import type { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { createRunningAveragedStat } from './task_run_calculators';
import { WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW_SIZE_MS } from '../config';

/**
 * The signal the background-task autoscaler scales on: running averages of
 * each term of the per-cycle sample, and `load` as the largest of them.
 */
export interface AutoscalingStat extends AutoscalingSignalSample {
  load: number;
}

export interface PublicBackgroundTaskUtilizationStat extends JsonObject {
  load: number;
  es_backpressure_active: number;
  autoscaling: AutoscalingStat;
}

export interface BackgroundTaskUtilizationStat extends PublicBackgroundTaskUtilizationStat {
  adhoc: AdhocTaskStat;
  recurring: TaskStat;
}

interface TaskStat extends JsonObject {
  ran: {
    service_time: {
      actual: number; // total service time for running recurring tasks
      adjusted: number; // total service time adjusted for polling interval
      task_counter: number; // recurring tasks counter, only increases for the lifetime of the process
    };
  };
}

interface AdhocTaskStat extends TaskStat {
  created: {
    counter: number; // counter for number of ad hoc tasks created
  };
}

export function createBackgroundTaskUtilizationAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  adHocTaskCounter: AdHocTaskCounter,
  pollInterval: number,
  workerUtilizationRunningAverageWindowSize?: number
): AggregatedStatProvider<BackgroundTaskUtilizationStat> {
  const workerUtilizationWindowSize =
    workerUtilizationRunningAverageWindowSize ??
    WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW_SIZE_MS / pollInterval;

  const taskRunEventToAdhocStat = createTaskRunEventToAdhocStat();
  const taskRunAdhocEvents$: Observable<Pick<BackgroundTaskUtilizationStat, 'adhoc'>> =
    taskPollingLifecycle.events.pipe(
      filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
      map((taskEvent: TaskLifecycleEvent) => ({
        taskEvent,
        ...unwrap((taskEvent as TaskRun).event),
      })),
      filter(({ task }) => get(task, 'schedule.interval', null) == null),
      map(({ taskEvent }) => {
        return taskRunEventToAdhocStat(taskEvent.timing!, adHocTaskCounter, pollInterval);
      })
    );

  const taskRunEventToRecurringStat = createTaskRunEventToRecurringStat();
  const taskRunRecurringEvents$: Observable<Pick<BackgroundTaskUtilizationStat, 'recurring'>> =
    taskPollingLifecycle.events.pipe(
      filter((taskEvent: TaskLifecycleEvent) => isTaskRunEvent(taskEvent) && hasTiming(taskEvent)),
      map((taskEvent: TaskLifecycleEvent) => ({
        taskEvent,
        ...unwrap((taskEvent as TaskRun).event),
      })),
      filter(({ task }) => get(task, 'schedule.interval', null) != null),
      map(({ taskEvent, task }) => {
        return taskRunEventToRecurringStat(taskEvent.timing!, task, pollInterval);
      })
    );

  const taskManagerUtilizationEventToLoadStat = createTaskRunEventToLoadStat(
    workerUtilizationWindowSize
  );

  const taskManagerWorkerUtilizationEvent$: Observable<
    Pick<BackgroundTaskUtilizationStat, 'load'>
  > = taskPollingLifecycle.events.pipe(
    filter(isTaskManagerWorkerUtilizationStatEvent),
    map((taskEvent: TaskLifecycleEvent) => taskEvent.event),
    map(mapOk((num: number) => taskManagerUtilizationEventToLoadStat(num)))
  );

  const taskManagerBackpressureEvent$: Observable<
    Pick<BackgroundTaskUtilizationStat, 'es_backpressure_active'>
  > = taskPollingLifecycle.events.pipe(
    filter(isTaskManagerBackpressureEvent),
    map((taskEvent) => ({ es_backpressure_active: unwrap(taskEvent.event).active ? 1 : 0 }))
  );

  const autoscalingSampleToStat = createAutoscalingSampleToStat(workerUtilizationWindowSize);
  const taskManagerAutoscalingEvent$: Observable<
    Pick<BackgroundTaskUtilizationStat, 'autoscaling'>
  > = taskPollingLifecycle.events.pipe(
    filter(isTaskManagerAutoscalingEvent),
    map((taskEvent) => autoscalingSampleToStat(unwrap(taskEvent.event)))
  );

  return combineLatest([
    taskRunAdhocEvents$.pipe(
      startWith({
        adhoc: {
          created: {
            counter: 0,
          },
          ran: {
            service_time: {
              actual: 0,
              adjusted: 0,
              task_counter: 0,
            },
          },
        },
      })
    ),
    taskRunRecurringEvents$.pipe(
      startWith({
        recurring: {
          ran: {
            service_time: {
              actual: 0,
              adjusted: 0,
              task_counter: 0,
            },
          },
        },
      })
    ),
    taskManagerWorkerUtilizationEvent$.pipe(
      startWith({
        load: 0,
      })
    ),
    taskManagerBackpressureEvent$.pipe(
      startWith({
        es_backpressure_active: 0,
      })
    ),
    taskManagerAutoscalingEvent$.pipe(startWith({ autoscaling: EMPTY_AUTOSCALING_STAT })),
  ]).pipe(
    map(
      ([adhoc, recurring, load, backpressure, autoscaling]: [
        Pick<BackgroundTaskUtilizationStat, 'adhoc'>,
        Pick<BackgroundTaskUtilizationStat, 'recurring'>,
        Pick<BackgroundTaskUtilizationStat, 'load'>,
        Pick<BackgroundTaskUtilizationStat, 'es_backpressure_active'>,
        Pick<BackgroundTaskUtilizationStat, 'autoscaling'>
      ]) => {
        return {
          key: 'utilization',
          value: {
            ...adhoc,
            ...recurring,
            ...load,
            ...backpressure,
            ...autoscaling,
          },
        } as AggregatedStat<BackgroundTaskUtilizationStat>;
      }
    )
  );
}

function hasTiming(taskEvent: TaskLifecycleEvent) {
  return !!taskEvent?.timing;
}

interface SummarizeUtilizationStatsOpts {
  lastUpdate: string;
  monitoredStats: MonitoredStat<BackgroundTaskUtilizationStat> | undefined;
  isInternal: boolean;
}

interface SummarizeUtilizationStatsResult {
  last_update: string;
  stats:
    | MonitoredStat<BackgroundTaskUtilizationStat>
    | MonitoredStat<PublicBackgroundTaskUtilizationStat>
    | null;
}

export function summarizeUtilizationStats({
  lastUpdate,
  monitoredStats,
  isInternal,
}: SummarizeUtilizationStatsOpts): SummarizeUtilizationStatsResult {
  const utilizationStats = monitoredStats?.value;

  if (!monitoredStats || !utilizationStats) {
    return { last_update: lastUpdate, stats: null };
  }

  return {
    last_update: lastUpdate,
    stats: {
      timestamp: monitoredStats.timestamp,
      value: isInternal
        ? utilizationStats
        : pick(utilizationStats, 'load', 'es_backpressure_active', 'autoscaling'),
    },
  };
}

function createTaskRunEventToAdhocStat() {
  let createdCounter = 0;
  let actualCounter = 0;
  let adjustedCounter = 0;
  let taskCounter = 0;
  return (
    timing: TaskTiming,
    adHocTaskCounter: AdHocTaskCounter,
    pollInterval: number
  ): Pick<BackgroundTaskUtilizationStat, 'adhoc'> => {
    const { duration, adjusted } = getServiceTimeStats(timing, pollInterval);
    const created = adHocTaskCounter.count;
    adHocTaskCounter.reset();
    return {
      adhoc: {
        created: {
          counter: (createdCounter += created),
        },
        ran: {
          service_time: {
            actual: (actualCounter += duration),
            adjusted: (adjustedCounter += adjusted),
            task_counter: (taskCounter += 1),
          },
        },
      },
    };
  };
}

function createTaskRunEventToRecurringStat() {
  let actualCounter = 0;
  let adjustedCounter = 0;
  let taskCounter = 0;
  return (
    timing: TaskTiming,
    task: ConcreteTaskInstance,
    pollInterval: number
  ): Pick<BackgroundTaskUtilizationStat, 'recurring'> => {
    const { duration, adjusted } = getServiceTimeStats(timing, pollInterval);
    return {
      recurring: {
        ran: {
          service_time: {
            actual: (actualCounter += duration),
            adjusted: (adjustedCounter += adjusted),
            task_counter: (taskCounter += 1),
          },
        },
      },
    };
  };
}

function createTaskRunEventToLoadStat(workerUtilizationRunningAverageWindowSize: number) {
  const loadQueue = createRunningAveragedStat<number>(workerUtilizationRunningAverageWindowSize);
  return (load: number): Pick<BackgroundTaskUtilizationStat, 'load'> => {
    const historicalLoad = loadQueue(load);
    return {
      load: stats.mean(historicalLoad),
    };
  };
}

const EMPTY_AUTOSCALING_STAT: AutoscalingStat = {
  load: 0,
  slot_load: 0,
  heap_load: 0,
  cpu_load: 0,
  backlog_load: 0,
  reference_capacity: 0,
};

/**
 * Smooths each term of the autoscaling sample over the worker-utilization
 * window, like `load`, and reports the largest smoothed term as `load`.
 */
function createAutoscalingSampleToStat(workerUtilizationRunningAverageWindowSize: number) {
  const slotQueue = createRunningAveragedStat<number>(workerUtilizationRunningAverageWindowSize);
  const heapQueue = createRunningAveragedStat<number>(workerUtilizationRunningAverageWindowSize);
  const cpuQueue = createRunningAveragedStat<number>(workerUtilizationRunningAverageWindowSize);
  const backlogQueue = createRunningAveragedStat<number>(workerUtilizationRunningAverageWindowSize);
  return (sample: AutoscalingSignalSample): Pick<BackgroundTaskUtilizationStat, 'autoscaling'> => {
    const slotLoad = stats.mean(slotQueue(sample.slot_load));
    const heapLoad = stats.mean(heapQueue(sample.heap_load));
    const cpuLoad = stats.mean(cpuQueue(sample.cpu_load));
    const backlogLoad = stats.mean(backlogQueue(sample.backlog_load));
    return {
      autoscaling: {
        load: Math.max(slotLoad, heapLoad, cpuLoad, backlogLoad),
        slot_load: slotLoad,
        heap_load: heapLoad,
        cpu_load: cpuLoad,
        backlog_load: backlogLoad,
        reference_capacity: sample.reference_capacity,
      },
    };
  };
}

function getServiceTimeStats(timing: TaskTiming, pollInterval: number) {
  const duration = timing!.stop - timing!.start;
  const adjusted = Math.ceil(duration / pollInterval) * pollInterval;
  return { duration, adjusted };
}
