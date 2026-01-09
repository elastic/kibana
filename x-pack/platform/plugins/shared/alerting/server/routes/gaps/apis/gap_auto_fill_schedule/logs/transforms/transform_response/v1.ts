/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler';
import type { GapAutoFillSchedulerLogsResult } from '../../../../../../../application/gaps/auto_fill_scheduler/methods/find_logs/types/find_gap_auto_fill_scheduler_logs_types';

export const transformResponse = (
  result: GapAutoFillSchedulerLogsResult
): GapAutoFillSchedulerLogsResponseBodyV1 => ({
  data: result.data.map((entry) => ({
    id: entry.id,
    status: entry.status,
    message: entry.message,
    timestamp: entry.timestamp,
    results: entry.results?.map((ruleResult) => ({
      rule_id: ruleResult.ruleId,
      processed_gaps: ruleResult.processedGaps,
      status: ruleResult.status,
      error: ruleResult.error,
    })),
  })),
  total: result.total,
  page: result.page,
  per_page: result.perPage,
});
