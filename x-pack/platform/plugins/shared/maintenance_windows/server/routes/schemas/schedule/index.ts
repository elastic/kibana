/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { scheduleRequestSchema, scheduleResponseSchema } from './schema/latest';
export type { ScheduleRequest } from './types/latest';

export {
  scheduleRequestSchema as scheduleRequestSchemaV1,
  scheduleResponseSchema as scheduleResponseSchemaV1,
} from './schema/v1';
export type { ScheduleRequest as ScheduleRequestV1 } from './types/v1';
