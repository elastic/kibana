/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EsRequestCategory, getCategoryForMethod } from './es_request_categories';
export { EsRequestLimitReachedError } from './errors';
export {
  ES_REQUEST_SCOPE_GROUPS,
  KNOWN_ES_REQUEST_SCOPES,
  resolveEsRequestScope,
  type EsRequestScopeGroup,
} from './es_request_scopes';
export {
  EsRequestLimiter,
  type AcquireOptions,
  type EsRequestLimiterStats,
  type EsRequestCategoryStats,
  type EsRequestScopeStats,
} from './es_request_limiter';
export { createLimitedEsClient, buildTaskEsClient } from './create_limited_es_client';
