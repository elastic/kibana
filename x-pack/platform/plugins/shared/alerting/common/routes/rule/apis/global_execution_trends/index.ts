/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  getGlobalExecutionTrendsQuerySchema,
  getGlobalExecutionTrendsResponseBodySchema,
} from './schemas/latest';
export type {
  GetGlobalExecutionTrendsQuery,
  GetGlobalExecutionTrendsResponseBody,
  GetGlobalExecutionTrendsResponse,
} from './types/latest';

export {
  getGlobalExecutionTrendsQuerySchema as getGlobalExecutionTrendsQuerySchemaV1,
  getGlobalExecutionTrendsResponseBodySchema as getGlobalExecutionTrendsResponseBodySchemaV1,
} from './schemas/v1';
export type {
  GetGlobalExecutionTrendsQuery as GetGlobalExecutionTrendsQueryV1,
  GetGlobalExecutionTrendsResponseBody as GetGlobalExecutionTrendsResponseBodyV1,
  GetGlobalExecutionTrendsResponse as GetGlobalExecutionTrendsResponseV1,
} from './types/v1';
