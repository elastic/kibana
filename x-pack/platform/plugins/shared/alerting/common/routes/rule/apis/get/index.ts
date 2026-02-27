/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getRuleRequestParamsSchema } from './external/schemas/latest';
export type { GetRuleRequestParams, GetRuleResponse } from './external/types/latest';

export {
  getRuleRequestParamsSchema as getRuleRequestParamsSchemaV1,
  getRuleResponseSchema as getRuleResponseSchemaV1,
} from './external/schemas/v1';
export type {
  GetRuleRequestParams as GetRuleRequestParamsV1,
  GetRuleResponse as GetRuleResponseV1,
} from './external/types/v1';
