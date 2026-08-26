/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fallbackToTransactionsRoute } from './fallback_to_transactions';

export const fallbackToTransactionsRouteDefinitions = {
  fallbackToTransactions: fallbackToTransactionsRoute,
};

export type { FallbackToTransactionsResponse } from './fallback_to_transactions';
