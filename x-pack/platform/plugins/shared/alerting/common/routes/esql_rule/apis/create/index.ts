/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  CreateESQLRuleRequestParams as CreateESQLRuleRequestParamsV1,
  CreateESQLRuleRequestBody as CreateESQLRuleRequestBodyV1,
  CreateESQLRuleResponse as CreateESQLRuleResponseV1,
} from './types/v1';
export {
  createESQLRuleParamsSchema as createESQLRuleParamsSchemaV1,
  createESQLBodySchema as createESQLBodySchemaV1,
} from './schemas/v1';
export type { CreateESQLRuleRequestParams } from './types/latest';
export type { CreateESQLRuleRequestBody } from './types/latest';
export type { CreateESQLRuleResponse } from './types/latest';
export { createESQLRuleParamsSchema } from './schemas/latest';
export { createESQLBodySchema } from './schemas/latest';
