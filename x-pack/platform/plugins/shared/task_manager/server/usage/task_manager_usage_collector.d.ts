/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { MonitoredHealth } from '../routes/health';
import type { TaskManagerUsage } from './types';
import type { MonitoredUtilization } from '../routes/background_task_utilization';
export declare function createTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[]
): import('@kbn/usage-collection-plugin/server').Collector<TaskManagerUsage, {}>;
export declare function registerTaskManagerUsageCollector(
  usageCollection: UsageCollectionSetup,
  monitoringStats$: Observable<MonitoredHealth>,
  monitoredUtilization$: Observable<MonitoredUtilization>,
  excludeTaskTypes: string[]
): void;
