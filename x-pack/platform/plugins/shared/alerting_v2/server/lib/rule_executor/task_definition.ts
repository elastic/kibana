/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';

import type { PluginConfig } from '../../config';
import type { AlertingServerStartDependencies } from '../../types';
import { createRuleExecutorTaskRunner } from './task_runner';
import type { AlertingResourcesService } from '../services/alerting_resources_service';

export const ALERTING_RULE_EXECUTOR_TASK_TYPE = 'alerting:esql' as const;

export function initializeRuleExecutorTaskDefinition(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingServerStartDependencies, unknown]>,
  config: PluginConfig,
  resourcesService: AlertingResourcesService
) {
  taskManager.registerTaskDefinitions({
    [ALERTING_RULE_EXECUTOR_TASK_TYPE]: {
      title: 'Alerting v2 rule executor (ES|QL)',
      timeout: '5m',
      paramsSchema: schema.object({
        ruleId: schema.string(),
        spaceId: schema.string(),
      }),
      createTaskRunner: createRuleExecutorTaskRunner({
        logger,
        coreStartServices,
        config,
        resourcesService,
      }),
    },
  });
}
