/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { updateESQLRuleParamsSchema as updateESQLRuleParamsSchemaV1 } from './schemas/v1';
export { updateESQLRuleParamsSchema } from './schemas/latest';

export { updateESQLBodySchema as updateESQLBodySchemaV1 } from './schemas/v1';
export { updateESQLBodySchema } from './schemas/latest';

export type {
  UpdateESQLRuleRequestParams as UpdateESQLRuleRequestParamsV1,
  UpdateESQLRuleRequestBody as UpdateESQLRuleRequestBodyV1,
  UpdateESQLRuleResponse as UpdateESQLRuleResponseV1,
} from './types/v1';
export type {
  UpdateESQLRuleRequestParams,
  UpdateESQLRuleRequestBody,
  UpdateESQLRuleResponse,
} from './types/latest';
