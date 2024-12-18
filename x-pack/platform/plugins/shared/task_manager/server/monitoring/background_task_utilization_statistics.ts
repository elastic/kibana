/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { get, pick } from 'lodash';
import stats from 'stats-lite';
import { combineLatest, filter, map, Observable, startWith } from 'rxjs';
import { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { mapOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent, TaskPollingLifecycle } from '../polling_lifecycle';
import { ConcreteTaskInstance } from '../task';
import {
  isTaskManagerWorkerUtilizationStatEvent,
  isTaskRunEvent,
  TaskRun,
  TaskTiming,
} from '../task_events';
import { MonitoredStat } from './monitoring_stats_stream';
import { AggregatedStat, AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
import { createRunningAveragedStat } from './task_run_calculators';
import { DEFAULT_WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW } from '../config';

export interface PublicBackgroundTaskUtilizationStat extends JsonObject {
  load: number;
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
  workerUtilizationRunningAverageWindowSize: number = DEFAULT_WORKER_UTILIZATION_RUNNING_AVERAGE_WINDOW
): AggregatedStatProvider<BackgroundTaskUtilizationStat> {
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
    workerUtilizationRunningAverageWindowSize
  );

  const taskManagerWorkerUtilizationEvent$: Observable<
    Pick<BackgroundTaskUtilizationStat, 'load'>
  > = taskPollingLifecycle.events.pipe(
    filter(isTaskManagerWorkerUtilizationStatEvent),
    map((taskEvent: TaskLifecycleEvent) => taskEvent.event),
    map(mapOk((num: number) => taskManagerUtilizationEventToLoadStat(num)))
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
  ]).pipe(
    map(
      ([adhoc, recurring, load]: [
        Pick<BackgroundTaskUtilizationStat, 'adhoc'>,
        Pick<BackgroundTaskUtilizationStat, 'recurring'>,
        Pick<BackgroundTaskUtilizationStat, 'load'>
      ]) => {
        return {
          key: 'utilization',
          value: {
            ...adhoc,
            ...recurring,
            ...load,
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
      value: isInternal ? utilizationStats : pick(utilizationStats, 'load'),
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

function getServiceTimeStats(timing: TaskTiming, pollInterval: number) {
  const duration = timing!.stop - timing!.start;
  const adjusted = Math.ceil(duration / pollInterval) * pollInterval;
  return { duration, adjusted };
}
