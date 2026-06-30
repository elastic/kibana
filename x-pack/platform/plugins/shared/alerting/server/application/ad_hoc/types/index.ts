/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  scheduleExecutionParamSchema,
  scheduleExecutionParamsSchema,
} from '../methods/execute/schemas/schedule_execution_params_schema';
import type {
  ScheduleBackfillResult,
  ScheduleBackfillResults,
  ScheduleBackfillError,
} from '../../backfill/methods/schedule/types';
import type { Backfill } from '../../backfill/result/types';

export type ScheduleExecutionParam = TypeOf<typeof scheduleExecutionParamSchema>;
export type ScheduleExecutionParams = TypeOf<typeof scheduleExecutionParamsSchema>;
export type ScheduleExecutionResult = ScheduleBackfillResult;
export type ScheduleExecutionResults = ScheduleBackfillResults;
export type ExecutionError = ScheduleBackfillError;
export type AdHocRunResult = Backfill;
