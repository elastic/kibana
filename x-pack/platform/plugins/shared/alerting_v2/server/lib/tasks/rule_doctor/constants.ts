/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

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
