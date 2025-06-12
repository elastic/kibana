/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { findGapsBodySchema, findGapsResponseSchema } from './schemas/latest';
export type { FindGapsRequestBody, FindGapsResponseBody, FindGapsResponse } from './types/latest';

export {
  findGapsBodySchema as findGapsBodySchemaV1,
  findGapsResponseSchema as findGapsResponseSchemaV1,
} from './schemas/v1';
export type {
  FindGapsRequestBody as FindGapsRequestBodyV1,
  FindGapsResponseBody as FindGapsResponseBodyV1,
  FindGapsResponse as FindGapsResponseV1,
} from './types/v1';
