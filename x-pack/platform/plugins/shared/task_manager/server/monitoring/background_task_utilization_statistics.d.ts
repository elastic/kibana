/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { MonitoredStat } from './monitoring_stats_stream';
import type { AggregatedStatProvider } from '../lib/runtime_statistics_aggregator';
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
      actual: number;
      adjusted: number;
      task_counter: number;
    };
  };
}
interface AdhocTaskStat extends TaskStat {
  created: {
    counter: number;
  };
}
export declare function createBackgroundTaskUtilizationAggregator(
  taskPollingLifecycle: TaskPollingLifecycle,
  adHocTaskCounter: AdHocTaskCounter,
  pollInterval: number,
  workerUtilizationRunningAverageWindowSize?: number
): AggregatedStatProvider<BackgroundTaskUtilizationStat>;
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
export declare function summarizeUtilizationStats({
  lastUpdate,
  monitoredStats,
  isInternal,
}: SummarizeUtilizationStatsOpts): SummarizeUtilizationStatsResult;
export {};
