/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { AlertingTaskDefinition } from '../services/task_run_scope_service/create_task_runner';
import { RuleExecutorTaskRunner } from './task_runner';
import {
  ALERTING_RULE_EXECUTOR_TASK_TYPE,
  DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT,
} from './constants';

/**
 * Task definition for rule executor.
 * Bound to TaskDefinition token and automatically registered with Task Manager on setup.
 */
export const RuleExecutorTaskDefinition: AlertingTaskDefinition<RuleExecutorTaskRunner> = {
  taskType: ALERTING_RULE_EXECUTOR_TASK_TYPE,
  title: 'Alerting v2 rule executor (ES|QL)',
  timeout: DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT,
  resolveTimeout: (config) =>
    config.rules.run.timeout ?? DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT,
  paramsSchema: schema.object({
    ruleId: schema.string(),
    spaceId: schema.string(),
  }),
  taskRunnerClass: RuleExecutorTaskRunner,
  requiresFakeRequest: true,
};
