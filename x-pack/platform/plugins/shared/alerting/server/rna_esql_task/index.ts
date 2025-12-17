/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';

import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { createEsqlRulesTaskRunner } from './task_runner';

export const ALERTING_ESQL_TASK_TYPE = 'alerting:esql' as const;

/**
 * Registers a dedicated Task Manager task type for future ES|QL rules execution.
 *
 * Minimal step on `main`: register a no-op runner so we can land the Task Manager wiring
 * and config naming independently of the ES|QL rule type implementation.
 */
export function initializeEsqlRulesTaskDefinition(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: AlertingConfig
) {
  const taskType = ALERTING_ESQL_TASK_TYPE;

  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: 'Alerting ES|QL rules executor',
      timeout: '5m',
      paramsSchema: schema.object({
        ruleId: schema.string(),
        spaceId: schema.string(),
        consumer: schema.maybe(schema.string()),
      }),
      createTaskRunner: createEsqlRulesTaskRunner({ logger, coreStartServices, config }),
      // what should we do about cost? since it depends on the ES|QL query
    },
  });
}
