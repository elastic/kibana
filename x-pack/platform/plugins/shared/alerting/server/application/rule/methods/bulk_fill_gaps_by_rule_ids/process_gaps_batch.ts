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
import type { BackfillInitiator } from '../../../../../common/constants';
import { GapFillSchedulePerRuleStatus } from './types';

interface ProcessGapsBatchParams {
  range: BulkFillGapsByRuleIdsParams['range'];
  gapsBatch: Gap[];
  maxGapsCountToProcess?: number;
  initiator: BackfillInitiator;
  initiatorId?: string;
}

interface ProcessGapsBatchResult {
  processedGapsCount: number;
  hasErrors: boolean;
  results: Array<{
    ruleId: string;
    processedGaps: number;
    status: GapFillSchedulePerRuleStatus;
    error?: string;
  }>;
}

export const processGapsBatch = async (
  context: RulesClientContext,
  { range, gapsBatch, maxGapsCountToProcess, initiator, initiatorId }: ProcessGapsBatchParams
): Promise<ProcessGapsBatchResult> => {
  const { start, end } = range;

  // Group gaps by rule ID
  const gapsByRuleId = new Map<string, Gap[]>();
  for (const gap of gapsBatch) {
    const ruleId = gap.ruleId;
    if (!ruleId) {
      continue; // Skip gaps without ruleId
    }
    if (!gapsByRuleId.has(ruleId)) {
      gapsByRuleId.set(ruleId, []);
    }
    gapsByRuleId.get(ruleId)!.push(gap);
  }

  const schedulingPayloads: Array<{
    ruleId: string;
    ranges: Array<{ start: string; end: string }>;
    initiator: BackfillInitiator;
    initiatorId?: string;
  }> = [];

  let totalProcessedGapsCount = 0;
  const gapsForScheduling: Gap[] = [];
  const results = [];
  const processedGapsByRuleId = new Map<string, number>();

  // Prepare all scheduling payloads from all rules
  for (const [ruleId, ruleBatch] of gapsByRuleId) {
    let ruleGapsClampedIntervals = ruleBatch
      .map((gap) => ({
        gap,
        clampedIntervals: clampIntervals(gap.unfilledIntervals, {
          gte: new Date(start),
          lte: new Date(end),
        }),
      }))
      .filter(({ clampedIntervals }) => clampedIntervals.length > 0);

    if (
      maxGapsCountToProcess &&
      totalProcessedGapsCount + ruleGapsClampedIntervals.length > maxGapsCountToProcess
    ) {
      const remainingSlots = maxGapsCountToProcess - totalProcessedGapsCount;
      ruleGapsClampedIntervals = ruleGapsClampedIntervals.slice(0, remainingSlots);
    }

    if (ruleGapsClampedIntervals.length === 0) {
      continue;
    }

    const ruleProcessedCount = ruleGapsClampedIntervals.length;
    totalProcessedGapsCount += ruleProcessedCount;
    processedGapsByRuleId.set(ruleId, ruleProcessedCount);
    gapsForScheduling.push(...ruleGapsClampedIntervals.map(({ gap }) => gap));

    const gapRanges = ruleGapsClampedIntervals.flatMap(({ clampedIntervals }) =>
      clampedIntervals.map(({ gte, lte }) => ({
        start: gte.toISOString(),
        end: lte.toISOString(),
      }))
    );

    schedulingPayloads.push({
      ruleId,
      ranges: gapRanges,
      initiator,
      ...(initiatorId ? { initiatorId } : {}),
    });

    // Stop if we've reached the max gaps count limit
    if (maxGapsCountToProcess && totalProcessedGapsCount >= maxGapsCountToProcess) {
      break;
    }
  }

  // Rules might have gaps within the range that don't yield any schedulingPayload
  // This can happen when they have gaps that are in an "in progress" state.
  if (schedulingPayloads.length === 0) {
    return {
      processedGapsCount: 0,
      results: [],
      hasErrors: false,
    };
  }

  // Schedule all backfills in a single bulk operation
  const scheduleResults = await scheduleBackfill(context, schedulingPayloads, gapsForScheduling);
  let hasErrors = false;
  for (let i = 0; i < scheduleResults.length; i++) {
    const result = scheduleResults[i];
    const ruleId = schedulingPayloads[i].ruleId;
    const processedGaps = processedGapsByRuleId.get(ruleId) || 0;

    if ('error' in result) {
      hasErrors = true;
      results.push({
        ruleId,
        processedGaps,
        status: GapFillSchedulePerRuleStatus.ERROR,
        error: result.error?.message || 'Unknown error',
      });
    } else {
      logProcessedAsAuditEvent(context, { id: ruleId, name: ruleId });
      results.push({
        ruleId,
        processedGaps,
        status: GapFillSchedulePerRuleStatus.SUCCESS,
      });
    }
  }

  return {
    processedGapsCount: totalProcessedGapsCount,
    results,
    hasErrors,
  };
};
