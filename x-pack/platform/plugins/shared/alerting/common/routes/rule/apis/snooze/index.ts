/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  snoozeParamsSchema,
  snoozeBodySchema,
  snoozeResponseSchema,
} from './external/schemas/latest';
export { snoozeParamsInternalSchema, snoozeBodyInternalSchema } from './internal/schemas/latest';
export type { SnoozeParams, SnoozeBody, SnoozeResponse } from './external/types/latest';

export {
  snoozeParamsSchema as snoozeParamsSchemaV1,
  snoozeBodySchema as snoozeBodySchemaV1,
  snoozeResponseSchema as snoozeResponseSchemaV1,
} from './external/schemas/v1';
export {
  snoozeParamsInternalSchema as snoozeParamsInternalSchemaV1,
  snoozeBodyInternalSchema as snoozeBodyInternalSchemaV1,
} from './internal/schemas/v1';
export type {
  SnoozeParams as SnoozeParamsV1,
  SnoozeBody as SnoozeBodyV1,
  SnoozeResponse as SnoozeResponseV1,
} from './external/types/v1';
