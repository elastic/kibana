/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetGapsSummaryByRuleIdsResponse } from '../../../../../../application/rule/methods/get_gaps_summary_by_rule_ids/types';
import { GetGapsSummaryByRuleIdsResponseBodyV1 } from '../../../../../../../common/routes/gaps/apis/get_gaps_summary_by_rule_ids';

export const transformResponse = (
  response: GetGapsSummaryByRuleIdsResponse
): GetGapsSummaryByRuleIdsResponseBodyV1 => ({
  data: response.data.map((gap) => ({
    rule_id: gap.ruleId,
    total_unfilled_duration_ms: gap.totalUnfilledDurationMs,
    total_in_progress_duration_ms: gap.totalInProgressDurationMs,
    total_filled_duration_ms: gap.totalFilledDurationMs,
  })),
});
