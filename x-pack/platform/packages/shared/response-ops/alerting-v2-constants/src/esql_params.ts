/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lowercase parameter names that the alerting v2 rule executor binds at
 * execution time (see `get_query_payload.ts`).
 **/
export const RESERVED_ESQL_PARAMS: readonly string[] = ['_tstart', '_tend'];
