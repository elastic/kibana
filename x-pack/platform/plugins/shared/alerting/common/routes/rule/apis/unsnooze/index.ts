/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  unsnoozeParamsInternalSchema,
  unsnoozeBodyInternalSchema,
} from './internal/schemas/latest';
export { unsnoozeParamsSchema } from './external/schemas/latest';
export type { UnsnoozeParams } from './external/types/latest';

export {
  unsnoozeParamsInternalSchema as unsnoozeParamsInternalSchemaV1,
  unsnoozeBodyInternalSchema as unsnoozeBodyInternalSchemaV1,
} from './internal/schemas/v1';
export { unsnoozeParamsSchema as unsnoozeParamsSchemaV1 } from './external/schemas/v1';
export type { UnsnoozeParams as UnsnoozeParamsV1 } from './external/types/v1';
