/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getRulesWithGapQuerySchema, getRulesWithGapResponseSchema } from './schemas/latest';
export type {
  GetRulesWithGapQuery,
  GetRulesWithGapResponse,
  GetRulesWithGapResponseBody,
} from './types/latest';

export {
  getRulesWithGapQuerySchema as getRulesWithGapQuerySchemaV1,
  getRulesWithGapResponseSchema as getRulesWithGapResponseSchemaV1,
} from './schemas/v1';

export type {
  GetRulesWithGapQuery as GetRulesWithGapQueryV1,
  GetRulesWithGapResponse as GetRulesWithGapResponseV1,
  GetRulesWithGapResponseBody as GetRulesWithGapResponseBodyV1,
} from './types/v1';
