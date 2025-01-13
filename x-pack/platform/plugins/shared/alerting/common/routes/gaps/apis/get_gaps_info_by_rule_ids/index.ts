/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getGapsInfoByRuleIdsQuerySchema,
  getGapsInfoByRuleIdsResponseSchema,
} from './schemas/latest';
export type {
  GetGapsInfoByRuleIdsQuery,
  GetGapsInfoByRuleIdsResponse,
  GetGapsInfoByRuleIdsResponseBody,
} from './types/latest';

export {
  getGapsInfoByRuleIdsQuerySchema as getGapsInfoByRuleIdsQuerySchemaV1,
  getGapsInfoByRuleIdsResponseSchema as getGapsInfoByRuleIdsResponseSchemaV1,
} from './schemas/v1';

export type {
  GetGapsInfoByRuleIdsQuery as GetGapsInfoByRuleIdsQueryV1,
  GetGapsInfoByRuleIdsResponse as GetGapsInfoByRuleIdsResponseV1,
  GetGapsInfoByRuleIdsResponseBody as GetGapsInfoByRuleIdsResponseBodyV1,
} from './types/v1';
