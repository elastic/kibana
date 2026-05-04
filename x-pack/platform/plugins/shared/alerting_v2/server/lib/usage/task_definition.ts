/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IntervalSchedule } from '@kbn/task-manager-plugin/server';
import type { AlertingServerSetupDependencies } from '../../types';
import { telemetryTaskRunner } from './task_runner';
import { stateSchemaByVersion } from './task_state';

export const TELEMETRY_TASK_TYPE = 'alerting_v2_telemetry';
export const TASK_ID = `AlertingV2-${TELEMETRY_TASK_TYPE}`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function registerTelemetryTask(
  logger: Logger,
  taskManager: AlertingServerSetupDependencies['taskManager'],
  getEsClient: () => ElasticsearchClient
): void {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Alerting v2 snapshot telemetry fetch task',
      timeout: '5m',
      stateSchemaByVersion,
      createTaskRunner: telemetryTaskRunner(logger, SCHEDULE, getEsClient),
    },
  });
}
