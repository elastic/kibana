/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { gapsResponseSchema, errorResponseSchema } from './schemas/latest';
export type { GapsResponse } from './types/latest';

export {
  gapsResponseSchema as gapsResponseSchemaV1,
  errorResponseSchema as errorResponseSchemaV1,
} from './schemas/v1';

export type { GapsResponse as GapsResponseV1, ErrorResponse as ErrorResponseV1 } from './types/v1';
