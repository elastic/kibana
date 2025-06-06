/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getGlobalExecutionSummarySchema,
  getGlobalExecutionSummaryResponseBodySchema,
} from './schemas/latest';
export type {
  GetGlobalExecutionSummary,
  GetGlobalExecutionSummaryResponseBody,
  GetGlobalExecutionSummaryResponse,
} from './types/latest';

export {
  getGlobalExecutionSummarySchema as getGlobalExecutionSummarySchemaV1,
  getGlobalExecutionSummaryResponseBodySchema as getGlobalExecutionSummaryResponseBodySchemaV1,
} from './schemas/v1';

export type {
  GetGlobalExecutionSummary as GetGlobalExecutionSummaryV1,
  GetGlobalExecutionSummaryResponse as GetGlobalExecutionSummaryResponseV1,
  GetGlobalExecutionSummaryResponseBody as GetGlobalExecutionSummaryResponseBodyV1,
} from './types/v1';
