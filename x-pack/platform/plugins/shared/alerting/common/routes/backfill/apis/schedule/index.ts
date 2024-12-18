/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { scheduleBodySchema, scheduleResponseSchema } from './schemas/latest';
export type {
  ScheduleBackfillRequestBody,
  ScheduleBackfillResponseBody,
  ScheduleBackfillResponse,
} from './types/latest';

export {
  scheduleBodySchema as scheduleBodySchemaV1,
  scheduleResponseSchema as scheduleResponseSchemaV1,
} from './schemas/v1';
export type {
  ScheduleBackfillRequestBody as ScheduleBackfillRequestBodyV1,
  ScheduleBackfillResponseBody as ScheduleBackfillResponseBodyV1,
  ScheduleBackfillResponse as ScheduleBackfillResponseV1,
} from './types/v1';
