/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { AlertingTaskDefinition } from '../../services/task_run_scope_service/create_task_runner';
import { RuleDoctorCoverageTaskRunner } from './task_runner';
import {
  RULE_DOCTOR_COVERAGE_TASK_TYPE,
  RULE_DOCTOR_COVERAGE_TASK_TIMEOUT,
} from './constants';

export {
  RULE_DOCTOR_COVERAGE_TASK_TYPE,
  RULE_DOCTOR_COVERAGE_TASK_TIMEOUT,
  CoverageSettingsProviderToken,
  getRuleDoctorCoverageTaskId,
} from './constants';
export type { CoverageSettingsProvider } from './constants';

export const RuleDoctorCoverageTaskDefinition: AlertingTaskDefinition<RuleDoctorCoverageTaskRunner> =
  {
    taskType: RULE_DOCTOR_COVERAGE_TASK_TYPE,
    title: 'Alerting v2 Rule Doctor coverage gap analysis',
    timeout: RULE_DOCTOR_COVERAGE_TASK_TIMEOUT,
    maxAttempts: 1,
    paramsSchema: schema.object({
      spaceId: schema.string(),
    }),
    taskRunnerClass: RuleDoctorCoverageTaskRunner,
    requiresFakeRequest: true,
  };
