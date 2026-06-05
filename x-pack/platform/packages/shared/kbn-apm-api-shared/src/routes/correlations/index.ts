/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldCandidatesTransactionsRoute } from './field_candidates_transactions';
import { fieldValueStatsTransactionsRoute } from './field_value_stats_transactions';
import { fieldValuePairsTransactionsRoute } from './field_value_pairs_transactions';
import { significantCorrelationsTransactionsRoute } from './significant_correlations_transactions';
import { pValuesTransactionsRoute } from './p_values_transactions';
import { unifiedCorrelationsRoute } from './unified_correlations';

export const correlationsRouteDefinitions = {
  fieldCandidatesTransactions: fieldCandidatesTransactionsRoute,
  fieldValueStatsTransactions: fieldValueStatsTransactionsRoute,
  fieldValuePairsTransactions: fieldValuePairsTransactionsRoute,
  significantCorrelationsTransactions: significantCorrelationsTransactionsRoute,
  pValuesTransactions: pValuesTransactionsRoute,
  unifiedCorrelations: unifiedCorrelationsRoute,
};

export type { DurationFieldCandidatesResponse } from './field_candidates_transactions';
export type { FieldValueStatsTransactionsResponse } from './field_value_stats_transactions';
export type { FieldValuePairsResponse } from './field_value_pairs_transactions';
export type { SignificantCorrelationsResponse } from './significant_correlations_transactions';
export type { PValuesResponse } from './p_values_transactions';
export type { UnifiedCorrelationsRouteResponse } from './unified_correlations';
