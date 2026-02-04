/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetRuleIdsWithGapBodyV1 } from '../../../../../../../common/routes/gaps/apis/get_rules_with_gaps';
import type { GetRuleIdsWithGapsParams } from '../../../../../../application/gaps/methods/get_rule_ids_with_gaps/types';

export const transformRequest = (request: GetRuleIdsWithGapBodyV1): GetRuleIdsWithGapsParams => ({
  start: request.start,
  end: request.end,
  statuses: request.statuses,
  highestPriorityGapFillStatuses: request.highest_priority_gap_fill_statuses,
  hasUnfilledIntervals: request.has_unfilled_intervals,
  hasInProgressIntervals: request.has_in_progress_intervals,
  hasFilledIntervals: request.has_filled_intervals,
  sortOrder: request.sort_order,
});
