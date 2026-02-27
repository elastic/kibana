/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { GetInternalRuleRequestParams, GetInternalRuleResponse } from './types/latest';

export {
  getInternalRuleRequestParamsSchema as getInternalRuleRequestParamsSchemaV1,
  getInternalRuleResponseSchema as getInternalRuleResponseSchemaV1,
} from './schemas/v1';
export type {
  GetInternalRuleRequestParams as GetInternalRuleRequestParamsV1,
  GetInternalRuleResponse as GetInternalRuleResponseV1,
} from './types/v1';
