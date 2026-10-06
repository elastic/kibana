/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger, DocLinksServiceSetup } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import type { MonitoredHealth } from '../routes/health';
export declare function resetLastLogLevel(): void;
export declare function setupIntervalLogging(
  monitoredHealth$: Observable<MonitoredHealth>,
  logger: Logger,
  minutes: number
): void;
export declare function logHealthMetrics(
  monitoredHealth: MonitoredHealth,
  logger: Logger,
  config: TaskManagerConfig,
  shouldRunTasks: boolean,
  docLinks: DocLinksServiceSetup
): void;
