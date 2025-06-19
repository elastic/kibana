/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { BulkFillGapsByRuleIdsParams } from './types';
import { BulkFillGapsScheduleResult, BulkGapsFillStep } from './types';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import type { BulkGapFillError } from './utils';
import { logProcessedAsAuditEvent, toBulkGapFillError } from './utils';
import type { RulesClientContext } from '../../../../rules_client';
import { processGapsBatch } from './process_gaps_batch';

interface BatchBackfillRuleGapsParams {
  rule: { id: string; name: string };
  range: BulkFillGapsByRuleIdsParams['range'];
  maxGapCountPerRule: number;
}

type BatchBackfillScheduleRuleGapsResult =
  | { outcome: BulkFillGapsScheduleResult.BACKFILLED }
  | { outcome: BulkFillGapsScheduleResult.SKIPPED }
  | { outcome: BulkFillGapsScheduleResult.ERRORED; error: BulkGapFillError };

export const batchBackfillRuleGaps = async (
  context: RulesClientContext,
  { rule, range, maxGapCountPerRule }: BatchBackfillRuleGapsParams
): Promise<BatchBackfillScheduleRuleGapsResult> => {
  const logger = context.logger.get('gaps');
  const { start, end } = range;
  let resultError: BulkGapFillError | undefined;
  let hasBeenBackfilled = false;

  const eventLogClient = await context.getEventLogClient();

  try {
    const processingResults = await processAllGapsInTimeRange({
      ruleId: rule.id,
      start,
      end,
      eventLogClient,
      logger,
      processGapsBatch: (gapsBatch: Gap[]) => processGapsBatch(context, { rule, range, gapsBatch }),
      options: { maxFetchedGaps: maxGapCountPerRule },
    });
    hasBeenBackfilled = processingResults.some((result) => result);
  } catch (error) {
    logProcessedAsAuditEvent(context, rule, error);
    resultError = toBulkGapFillError(rule, BulkGapsFillStep.SCHEDULING, error);
  }

  if (!resultError && !hasBeenBackfilled) {
    return {
      outcome: BulkFillGapsScheduleResult.SKIPPED,
    };
  }

  if (resultError) {
    return {
      outcome: BulkFillGapsScheduleResult.ERRORED,
      error: resultError,
    };
  }

  return {
    outcome: BulkFillGapsScheduleResult.BACKFILLED,
  };
};
