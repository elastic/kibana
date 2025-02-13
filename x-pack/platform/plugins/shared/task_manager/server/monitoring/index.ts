/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Observable } from 'rxjs';
import { TaskManagerConfig } from '../config';
import {
  MonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';
import { TaskStore } from '../task_store';
import { TaskPollingLifecycle } from '../polling_lifecycle';
import { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import { TaskTypeDictionary } from '../task_type_dictionary';

export type { MonitoringStats, RawMonitoringStats } from './monitoring_stats_stream';
export {
  HealthStatus,
  summarizeMonitoringStats,
  createAggregators,
  createMonitoringStatsStream,
} from './monitoring_stats_stream';

export interface CreateMonitoringStatsOpts {
  taskStore: TaskStore;
  elasticsearchAndSOAvailability$: Observable<boolean>;
  config: TaskManagerConfig;
  logger: Logger;
  adHocTaskCounter: AdHocTaskCounter;
  taskDefinitions: TaskTypeDictionary;
  startingCapacity: number;
  taskPollingLifecycle?: TaskPollingLifecycle;
}

export function createMonitoringStats(
  opts: CreateMonitoringStatsOpts
): Observable<MonitoringStats> {
  return createMonitoringStatsStream(createAggregators(opts));
}
