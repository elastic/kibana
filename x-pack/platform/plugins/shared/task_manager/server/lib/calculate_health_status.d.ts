/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RawMonitoringStats } from '../monitoring';
import type { HealthStatus } from '../monitoring';
import type { TaskManagerConfig } from '../config';
export declare function calculateHealthStatus(
  summarizedStats: RawMonitoringStats,
  config: TaskManagerConfig,
  shouldRunTasks: boolean,
  logger: Logger
): {
  status: HealthStatus;
  reason?: string;
};
