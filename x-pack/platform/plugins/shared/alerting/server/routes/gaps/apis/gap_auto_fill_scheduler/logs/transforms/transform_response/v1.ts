/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '../../../../../../../../common/routes/gaps/apis/gap_auto_fill_scheduler_logs';
import type { GapFillAutoSchedulerLogsResult } from '../../../../../../../application/gap_auto_fill_scheduler/methods/get_logs/types';

export const transformResponse = (
  result: GapFillAutoSchedulerLogsResult
): GapAutoFillSchedulerLogsResponseBodyV1 => ({
  data: result.data.map((entry) => ({
    timestamp: entry.timestamp,
    status: entry.status,
    message: entry.message,
    duration_ms: entry.durationMs,
    summary: {
      total_rules: entry.summary.totalRules,
      successful_rules: entry.summary.successfulRules,
      failed_rules: entry.summary.failedRules,
      total_gaps_processed: entry.summary.totalGapsProcessed,
    },
    config: {
      name: entry.config.name,
      max_amount_of_gaps_to_process_per_run: entry.config.maxAmountOfGapsToProcessPerRun,
      max_amount_of_rules_to_process_per_run: entry.config.maxAmountOfRulesToProcessPerRun,
      amount_of_retries: entry.config.amountOfRetries,
      rules_filter: entry.config.rulesFilter,
      gap_fill_range: entry.config.gapFillRange,
      schedule: {
        interval: entry.config.schedule.interval,
      },
    },
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
