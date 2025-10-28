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
import { backfillInitiator } from '../../../../../common/constants';

interface ProcessGapsBatchParams {
  rule: { id: string; name: string };
  range: BulkFillGapsByRuleIdsParams['range'];
  gapsBatch: Gap[];
  maxGapsCountToProcess?: number;
}

interface ProcessGapsBatchResult {
  processedGapsCount: number;
}

export const processGapsBatch = async (
  context: RulesClientContext,
  { rule, range, gapsBatch, maxGapsCountToProcess }: ProcessGapsBatchParams
): Promise<ProcessGapsBatchResult> => {
  const { start, end } = range;
  let processedGapsCount = 0;
  let gapsClampedIntervals = gapsBatch
    .map((gap) => ({
      gap,
      clampedIntervals: clampIntervals(gap.unfilledIntervals, {
        gte: new Date(start),
        lte: new Date(end),
      }),
    }))
    .filter(({ clampedIntervals }) => clampedIntervals.length > 0);

  if (maxGapsCountToProcess && maxGapsCountToProcess < gapsClampedIntervals.length) {
    gapsClampedIntervals = gapsClampedIntervals.slice(
      0,
      Math.min(maxGapsCountToProcess, gapsClampedIntervals.length)
    );
  }

  processedGapsCount += gapsClampedIntervals.length;

  const gapsInBackfillScheduling = gapsClampedIntervals.map(({ gap }) => gap);

  const gapRanges = gapsClampedIntervals.flatMap(({ clampedIntervals }) =>
    clampedIntervals.map(({ gte, lte }) => ({
      start: gte.toISOString(),
      end: lte.toISOString(),
    }))
  );

  // Rules might have gaps within the range that don't yield any schedulingPayload
  // This can happen when they have gaps that are in an "in progress" state.
  // They are returned still returned by the function that is querying gaps
  if (gapRanges.length === 0) {
    return {
      processedGapsCount: 0,
    };
  }

  const schedulingPayload = {
    ruleId: rule.id,
    ranges: gapRanges,
    initiator: backfillInitiator.USER,
  };

  const results = await scheduleBackfill(context, [schedulingPayload], gapsInBackfillScheduling);
  if (results.length !== 1) {
    throw new Error(`Unexpected scheduling result count ${results.length}`);
  } else if ('error' in results[0]) {
    const backfillError = results[0].error;
    throw new Error(backfillError.message);
  } else {
    logProcessedAsAuditEvent(context, rule);
  }

  return {
    processedGapsCount,
  };
};
