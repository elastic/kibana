/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getGapsSummaryByRuleIdsQuerySchema,
  getGapsSummaryByRuleIdsResponseSchema,
} from './schemas/latest';
export type {
  GetGapsSummaryByRuleIdsQuery,
  GetGapsSummaryByRuleIdsResponse,
  GetGapsSummaryByRuleIdsResponseBody,
} from './types/latest';

export {
  getGapsSummaryByRuleIdsQuerySchema as getGapsSummaryByRuleIdsQuerySchemaV1,
  getGapsSummaryByRuleIdsResponseSchema as getGapsSummaryByRuleIdsResponseSchemaV1,
} from './schemas/v1';

export type {
  GetGapsSummaryByRuleIdsQuery as GetGapsSummaryByRuleIdsQueryV1,
  GetGapsSummaryByRuleIdsResponse as GetGapsSummaryByRuleIdsResponseV1,
  GetGapsSummaryByRuleIdsResponseBody as GetGapsSummaryByRuleIdsResponseBodyV1,
} from './types/v1';
