/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingTaskDefinition } from '../../services/task_run_scope_service/create_task_runner';
import { FindingsCleanupTaskRunner } from './task_runner';

export const CLEANUP_FINDINGS_TASK_TYPE = 'alerting_v2:cleanup_findings' as const;
export const CLEANUP_FINDINGS_TASK_ID = 'alerting_v2:cleanup_findings:1.0.0' as const;
export const CLEANUP_FINDINGS_TASK_INTERVAL = '24h';
export const CLEANUP_FINDINGS_RETENTION_DAYS = 90;

export const FindingsCleanupTaskDefinition: AlertingTaskDefinition<FindingsCleanupTaskRunner> = {
  taskType: CLEANUP_FINDINGS_TASK_TYPE,
  title: 'Alerting v2 findings cleanup',
  timeout: CLEANUP_FINDINGS_TASK_INTERVAL,
  maxAttempts: 1,
  paramsSchema: schema.object({}),
  taskRunnerClass: FindingsCleanupTaskRunner,
  requiresFakeRequest: false,
};
