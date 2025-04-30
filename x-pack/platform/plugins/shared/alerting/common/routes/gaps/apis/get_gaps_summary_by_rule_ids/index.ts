/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getGapsSummaryByRuleIdsBodySchema,
  getGapsSummaryByRuleIdsResponseSchema,
} from './schemas/latest';
export type {
  GetGapsSummaryByRuleIdsBody,
  GetGapsSummaryByRuleIdsResponse,
  GetGapsSummaryByRuleIdsResponseBody,
} from './types/latest';

export {
  getGapsSummaryByRuleIdsBodySchema as getGapsSummaryByRuleIdsBodySchemaV1,
  getGapsSummaryByRuleIdsResponseSchema as getGapsSummaryByRuleIdsResponseSchemaV1,
} from './schemas/v1';

export type {
  GetGapsSummaryByRuleIdsBody as GetGapsSummaryByRuleIdsBodyV1,
  GetGapsSummaryByRuleIdsResponse as GetGapsSummaryByRuleIdsResponseV1,
  GetGapsSummaryByRuleIdsResponseBody as GetGapsSummaryByRuleIdsResponseBodyV1,
} from './types/v1';
