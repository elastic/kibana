/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingTaskDefinition } from '../services/task_run_scope_service/create_task_runner';
import { TELEMETRY_TASK_TYPE } from './constants';
import { TelemetryTaskRunner } from './task_runner';
import { stateSchemaByVersion } from './task_state';

/**
 * Task definition for the snapshot telemetry fetch task.
 * Bound to the TaskDefinition token and automatically registered with Task
 * Manager on setup. Runs with the internal user (no fakeRequest required).
 */
export const TelemetryTaskDefinition: AlertingTaskDefinition<TelemetryTaskRunner> = {
  taskType: TELEMETRY_TASK_TYPE,
  title: 'Alerting v2 snapshot telemetry fetch task',
  timeout: '5m',
  stateSchemaByVersion,
  taskRunnerClass: TelemetryTaskRunner,
  requiresFakeRequest: false,
};
