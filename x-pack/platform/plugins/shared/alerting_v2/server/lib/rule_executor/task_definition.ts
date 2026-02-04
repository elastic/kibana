/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { AlertingTaskDefinition } from '../services/task_run_scope_service/create_task_runner';
import { RuleExecutorTaskRunner } from './task_runner';

export const ALERTING_RULE_EXECUTOR_TASK_TYPE = 'alerting_v2:rule_executor' as const;

/**
 * Task definition for rule executor.
 * Bound to TaskDefinition token and automatically registered with Task Manager on setup.
 */
export const RuleExecutorTaskDefinition: AlertingTaskDefinition<RuleExecutorTaskRunner> = {
  taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
  title: 'Alerting v2 rule executor (ES|QL)',
  timeout: '5m',
  paramsSchema: schema.object({
    ruleId: schema.string(),
    spaceId: schema.string(),
  }),
  taskRunnerClass: RuleExecutorTaskRunner,
  requiresFakeRequest: true,
};
