/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getRuleIdsWithGapBodySchema, getRuleIdsWithGapResponseSchema } from './schemas/latest';
export type {
  GetRuleIdsWithGapBody,
  GetRuleIdsWithGapResponse,
  GetRuleIdsWithGapResponseBody,
} from './types/latest';

export {
  getRuleIdsWithGapBodySchema as getRuleIdsWithGapBodySchemaV1,
  getRuleIdsWithGapResponseSchema as getRuleIdsWithGapResponseSchemaV1,
} from './schemas/v1';

export type {
  GetRuleIdsWithGapBody as GetRuleIdsWithGapBodyV1,
  GetRuleIdsWithGapResponse as GetRuleIdsWithGapResponseV1,
  GetRuleIdsWithGapResponseBody as GetRuleIdsWithGapResponseBodyV1,
} from './types/v1';
