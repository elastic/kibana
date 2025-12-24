/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';

import type { AlertingV2Config } from '../config';
import type { AlertingServerStartDependencies } from '../types';
import { createEsqlRulesTaskRunner } from './task_runner';

export const ALERTING_ESQL_TASK_TYPE = 'alerting:esql' as const;

export function initializeEsqlRulesTaskDefinition(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingServerStartDependencies, unknown]>,
  config: AlertingV2Config
) {
  taskManager.registerTaskDefinitions({
    [ALERTING_ESQL_TASK_TYPE]: {
      title: 'Alerting v2 ES|QL rules executor',
      timeout: '5m',
      paramsSchema: schema.object({
        ruleId: schema.string(),
        spaceId: schema.string(),
      }),
      createTaskRunner: createEsqlRulesTaskRunner({ logger, coreStartServices, config }),
    },
  });
}
