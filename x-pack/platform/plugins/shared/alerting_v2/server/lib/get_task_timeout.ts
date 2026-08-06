/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfig } from '../config';
import type {
  AlertingTaskDefinition,
  AlertingTaskRunner,
} from './services/task_run_scope_service/create_task_runner';
import {
  ALERTING_RULE_EXECUTOR_TASK_TYPE,
  DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT,
} from './rule_executor/constants';

/**
 * Resolves the Task Manager timeout for the rule executor task
 * and returns the task definition.timeout for all other tasks.
 */
export const getTaskTimeout = (
  config: PluginConfig,
  definition: AlertingTaskDefinition<AlertingTaskRunner>
): string => {
  if (definition.taskType === ALERTING_RULE_EXECUTOR_TASK_TYPE) {
    return (
      config.rules.run.timeout ?? definition.timeout ?? DEFAULT_ALERTING_RULE_EXECUTOR_TASK_TIMEOUT
    );
  }

  return definition.timeout;
};
