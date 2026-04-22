/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ServiceIdentifier } from 'inversify';
import type { AlertingTaskDefinition } from '../../services/task_run_scope_service/create_task_runner';
import { RuleDoctorTaskRunner } from './task_runner';

export const RULE_DOCTOR_TASK_TYPE = 'alerting_v2:rule_doctor' as const;
export const RULE_DOCTOR_DEFAULT_INTERVAL = '1d';
export const RULE_DOCTOR_TASK_TIMEOUT = '10m';

export type RuleDoctorSettingsProvider = () => Promise<{
  intervalHours: number;
  continuous: boolean;
}>;

export const RuleDoctorSettingsProviderToken = Symbol.for(
  'alerting_v2.RuleDoctorSettingsProvider'
) as ServiceIdentifier<RuleDoctorSettingsProvider>;

export const getRuleDoctorTaskId = (spaceId: string) =>
  `${RULE_DOCTOR_TASK_TYPE}:${spaceId}` as const;

export const RuleDoctorTaskDefinition: AlertingTaskDefinition<RuleDoctorTaskRunner> = {
  taskType: RULE_DOCTOR_TASK_TYPE,
  title: 'Alerting v2 Rule Doctor analysis',
  timeout: RULE_DOCTOR_TASK_TIMEOUT,
  maxAttempts: 1,
  paramsSchema: schema.object({ spaceId: schema.string() }),
  taskRunnerClass: RuleDoctorTaskRunner,
  requiresFakeRequest: true,
};
