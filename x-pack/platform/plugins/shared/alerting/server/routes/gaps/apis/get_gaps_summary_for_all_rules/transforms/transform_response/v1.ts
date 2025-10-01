/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetGapsSummaryForAllRulesResponseV1 } from '../../../../../../../common/routes/gaps/apis/get_gaps_summary_for_all_rules';
import type { GetGapsSummaryForAllRulesResponse } from '../../../../../../application/rule/methods/get_gaps_summary_for_all_rules/types';

export const transformResponse = (
  result: GetGapsSummaryForAllRulesResponse
): GetGapsSummaryForAllRulesResponseV1['body'] => ({
  total_unfilled_duration_ms: result.totalUnfilledDurationMs,
  total_in_progress_duration_ms: result.totalInProgressDurationMs,
  total_filled_duration_ms: result.totalFilledDurationMs,
  total_gap_duration_ms: result.totalGapDurationMs,
  total_unfilled_rules: result.totalUnfilledRules,
  total_in_progress_rules: result.totalInProgressRules,
  total_filled_rules: result.totalFilledRules,
});
