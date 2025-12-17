/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart } from '../plugin';
import { spaceIdToNamespace } from '../lib';

export const ALERTING_ESQL_TASK_TYPE = 'alerting:esql' as const;

export interface EsqlRulesTaskParams {
  ruleId: string;
}

export function getEsqlRulesAlertsDataStreamName({
  config,
  spaceId,
  spaces,
}: {
  config: AlertingConfig;
  spaceId: string;
  spaces?: AlertingPluginsStart['spaces'];
}) {
  const namespace = spaceIdToNamespace(spaces, spaceId) ?? 'default';
  return `${config.esqlRules.alertsDataStreamPrefix}-${namespace}`;
}

/**
 * Registers a dedicated Task Manager task type for future ES|QL rules execution.
 *
 * Minimal step on `main`: register a no-op runner so we can land the Task Manager wiring
 * and config naming independently of the ES|QL rule type implementation.
 */
export function initializeEsqlRulesTaskDefinition(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  _coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>,
  config: AlertingConfig
) {
  const taskType = ALERTING_ESQL_TASK_TYPE;

  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: 'Alerting ES|QL rules executor',
      timeout: '5m',
      createTaskRunner: ({ taskInstance }: RunContext) => {
        return {
          async run() {
            return { state: taskInstance.state };
          },
        };
      },
      // what should we do about cost? since it depends on the ES|QL query
    },
  });
}
