/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Observable } from 'rxjs';
import type { TaskManagerConfig } from '../config';
import type { MonitoringStats } from './monitoring_stats_stream';
import { createAggregators, createMonitoringStatsStream } from './monitoring_stats_stream';
import type { TaskStore } from '../task_store';
import type { TaskPollingLifecycle } from '../polling_lifecycle';
import type { AdHocTaskCounter } from '../lib/adhoc_task_counter';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { EphemeralTaskLifecycle } from '../ephemeral_task_lifecycle';

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
  ephemeralTaskLifecycle?: EphemeralTaskLifecycle;
}

export function createMonitoringStats(
  opts: CreateMonitoringStatsOpts
): Observable<MonitoringStats> {
  return createMonitoringStatsStream(createAggregators(opts));
}
