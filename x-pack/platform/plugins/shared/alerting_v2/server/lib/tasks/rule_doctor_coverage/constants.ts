/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceIdentifier } from 'inversify';

export const RULE_DOCTOR_COVERAGE_TASK_TYPE = 'alerting_v2:rule_doctor_coverage' as const;
export const RULE_DOCTOR_COVERAGE_TASK_TIMEOUT = '30m';

export const getRuleDoctorCoverageTaskId = (spaceId: string) =>
  `${RULE_DOCTOR_COVERAGE_TASK_TYPE}:${spaceId}` as const;

export type CoverageSettingsProvider = () => Promise<{
  intervalHours: number;
  continuous: boolean;
  cadenceMinutes: number;
}>;

export const CoverageSettingsProviderToken = Symbol.for(
  'alerting_v2.CoverageSettingsProvider'
) as ServiceIdentifier<CoverageSettingsProvider>;
