/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { clampIntervals } from '../../../../lib/rule_gaps/gap/interval_utils';
import type { BulkFillGapsByRuleIdsParams } from './types';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import type { BulkGapFillError } from './utils';
import { logProcessedAsAuditEvent, toBulkGapFillError } from './utils';
import type { RulesClientContext } from '../../../../rules_client';

interface BatchBackfillRuleGapsParams {
  rule: { id: string; name: string };
  range: BulkFillGapsByRuleIdsParams['range'];
}

type BatchBackfillScheduleRuleGapsResult =
  | { outcome: 'backfilled' }
  | { outcome: 'skipped' }
  | { outcome: 'errored'; error: BulkGapFillError };

export const batchBackfillRuleGaps = async (
  context: RulesClientContext,
  { rule, range }: BatchBackfillRuleGapsParams
): Promise<BatchBackfillScheduleRuleGapsResult> => {
  const logger = context.logger;
  const { start, end } = range;
  let resultError: BulkGapFillError | undefined;
  let hasBeenBackfilled = false;

  const processGapsBatch = async (gapsBatch: Gap[]) => {
    const gapRanges = gapsBatch.flatMap((gap) => {
      const clampedIntervals = clampIntervals(gap.unfilledIntervals, {
        gte: new Date(start),
        lte: new Date(end),
      });
      return clampedIntervals.map(({ gte, lte }) => {
        return {
          start: gte.toISOString(),
          end: lte.toISOString(),
        };
      });
    });

    // Rules might have gaps within the range that don't yield any schedulingPayload
    // This can happen when they have gaps that are in an "in progress" state.
    // They are returned still returned by the function that is querying gaps
    if (gapRanges.length === 0) {
      return;
    }

    const schedulingPayload = {
      ruleId: rule.id,
      ranges: gapRanges,
    };

    const results = await scheduleBackfill(context, [schedulingPayload], gapsBatch);
    if (results.length !== 1) {
      throw new Error(`Unexpected scheduling result count ${results.length}`);
    } else if ('error' in results[0]) {
      const backfillError = results[0].error;
      throw new Error(backfillError.message);
    } else {
      hasBeenBackfilled = true;
      logProcessedAsAuditEvent(context, rule);
    }
  };

  const eventLogClient = await context.getEventLogClient();

  try {
    await processAllGapsInTimeRange({
      ruleId: rule.id,
      start,
      end,
      eventLogClient,
      logger,
      processGapsBatch,
      options: { maxFetchedGaps: 1000 },
    });
  } catch (error) {
    logProcessedAsAuditEvent(context, rule, error);
    resultError = toBulkGapFillError(rule, 'BULK_GAPS_FILL_STEP_SCHEDULING', error);
  }

  if (!resultError && !hasBeenBackfilled) {
    return {
      outcome: 'skipped',
    };
  }

  if (resultError) {
    return {
      outcome: 'errored',
      error: resultError,
    };
  }

  return {
    outcome: 'backfilled',
  };
};
