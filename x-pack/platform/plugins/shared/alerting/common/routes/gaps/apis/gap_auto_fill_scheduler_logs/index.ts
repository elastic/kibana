/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  autoFillSchedulerLogsQuerySchema,
  autoFillSchedulerLogsResponseSchema,
} from './schemas/latest';
export type {
  GapAutoFillSchedulerLogsQuery,
  GapAutoFillSchedulerLogsResponseBody,
  GapAutoFillSchedulerLogsResponse,
} from './types/latest';

export {
  autoFillSchedulerLogsQuerySchema as autoFillSchedulerLogsQuerySchemaV1,
  autoFillSchedulerLogsResponseSchema as autoFillSchedulerLogsResponseSchemaV1,
} from './schemas/v1';
export type {
  GapAutoFillSchedulerLogsQuery as GapAutoFillSchedulerLogsQueryV1,
  GapAutoFillSchedulerLogsResponseBody as GapAutoFillSchedulerLogsResponseBodyV1,
  GapAutoFillSchedulerLogsResponse as GapAutoFillSchedulerLogsResponseV1,
} from './types/v1';
