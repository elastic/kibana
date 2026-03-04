/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleIdsWithGapsResponse } from '../../../../../../application/gaps/methods/get_rule_ids_with_gaps/types';
import type { GetRuleIdsWithGapResponseBodyV1 } from '../../../../../../../common/routes/gaps/apis/get_rules_with_gaps';

export const transformResponse = (
  response: GetRuleIdsWithGapsResponse
): GetRuleIdsWithGapResponseBodyV1 => ({
  total: response.total,
  rule_ids: response.ruleIds,
  latest_gap_timestamp: response.latestGapTimestamp,
  summary: {
    total_unfilled_duration_ms: response.summary.totalUnfilledDurationMs,
    total_in_progress_duration_ms: response.summary.totalInProgressDurationMs,
    total_filled_duration_ms: response.summary.totalFilledDurationMs,
    total_duration_ms: response.summary.totalDurationMs,
    rules_by_gap_fill_status: {
      unfilled: response.summary.rulesByGapFillStatus.unfilled,
      in_progress: response.summary.rulesByGapFillStatus.inProgress,
      filled: response.summary.rulesByGapFillStatus.filled,
    },
  },
});
