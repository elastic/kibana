/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { clampIntervals } from '../../../../lib/rule_gaps/gap/interval_utils';
import type { BulkFillGapsByRuleIdsParams } from './types';
import type { Gap } from '../../../../lib/rule_gaps/gap';
import { scheduleBackfill } from '../../../backfill/methods/schedule';
import { logProcessedAsAuditEvent } from './utils';
import type { RulesClientContext } from '../../../../rules_client';

interface ProcessGapsBatchParams {
  rule: { id: string; name: string };
  range: BulkFillGapsByRuleIdsParams['range'];
  gapsBatch: Gap[];
}
export const processGapsBatch = async (
  context: RulesClientContext,
  { rule, range, gapsBatch }: ProcessGapsBatchParams
): Promise<boolean> => {
  const { start, end } = range;
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
    return false;
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
    logProcessedAsAuditEvent(context, rule);
  }

  return true;
};
