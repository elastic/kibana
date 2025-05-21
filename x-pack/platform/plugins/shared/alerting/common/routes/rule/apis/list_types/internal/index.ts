/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getRuleTypesInternalResponseSchema,
  getRuleTypesInternalResponseBodySchema,
} from './schemas/latest';
export type {
  GetRuleTypesInternalResponse,
  GetRuleTypesInternalResponseBody,
} from './types/latest';

export {
  getRuleTypesInternalResponseSchema as getRuleTypesInternalResponseSchemaV1,
  getRuleTypesInternalResponseBodySchema as getRuleTypesInternalResponseBodySchemaV1,
} from './schemas/v1';
export type {
  GetRuleTypesInternalResponse as GetRuleTypesInternalV1,
  GetRuleTypesInternalResponseBody as GetRuleTypesInternalResponseBodyV1,
} from './types/v1';
