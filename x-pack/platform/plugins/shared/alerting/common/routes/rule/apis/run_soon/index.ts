/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { runSoonRequestParamsSchema, runSoonRequestQuerySchema } from './schemas/latest';
export type { RunSoonRequestParams, RunSoonRequestQuery } from './types/latest';

export {
  runSoonRequestParamsSchema as runSoonRequestParamsSchemaV1,
  runSoonRequestQuerySchema as runSoonRequestQuerySchemaV1,
} from './schemas/v1';
export type {
  RunSoonRequestParams as RunSoonRequestParamsV1,
  RunSoonRequestQuery as RunSoonRequestQueryV1,
} from './types/v1';
