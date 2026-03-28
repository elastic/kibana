/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingTaskDefinition } from '../services/task_run_scope_service/create_task_runner';
import { DispatcherTaskRunner } from './task_runner';

export const DISPATCHER_TASK_TYPE = 'alerting_v2:dispatcher' as const;
export const DISPATCHER_TASK_ID = 'alerting_v2:dispatcher:1.0.0' as const;

/**
 * Task definition for dispatcher.
 * Bound to TaskDefinition token and automatically registered with Task Manager on setup.
 */
export const DispatcherTaskDefinition: AlertingTaskDefinition<DispatcherTaskRunner> = {
  taskType: DISPATCHER_TASK_TYPE,
  title: 'Alerting v2 dispatcher',
  timeout: '1m',
  maxAttempts: 1,
  paramsSchema: schema.object({}),
  taskRunnerClass: DispatcherTaskRunner,
  requiresFakeRequest: false,
};
