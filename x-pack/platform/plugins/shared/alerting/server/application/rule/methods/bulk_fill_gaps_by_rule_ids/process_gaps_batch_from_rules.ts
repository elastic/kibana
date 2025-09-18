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

interface ProcessGapsBatchFromRulesParams {
  gaps: Gap[];
  range: BulkFillGapsByRuleIdsParams['range'];
}

export const processGapsBatchFromRules = async (
  context: RulesClientContext,
  { gaps, range }: ProcessGapsBatchFromRulesParams
): Promise<{
  results: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error';
    error?: string;
  }>;
}> => {
  const { start, end } = range;
  const results: Array<{
    ruleId: string;
    processedGaps: number;
    status: 'success' | 'error';
    error?: string;
  }> = [];
  const schedulingPayloads: Array<{
    ruleId: string;
    ranges: Array<{ start: string; end: string }>;
  }> = [];

  // Group gaps by rule ID
  const gapsByRuleId = new Map<string, Gap[]>();
  for (const gap of gaps) {
    const ruleId = gap.ruleId;
    if (!ruleId) {
      continue; // Skip gaps without ruleId
    }
    if (!gapsByRuleId.has(ruleId)) {
      gapsByRuleId.set(ruleId, []);
    }
    gapsByRuleId.get(ruleId)!.push(gap);
  }

  // Prepare all scheduling payloads from all rules
  for (const [ruleId, gapsBatch] of gapsByRuleId) {
    const gapRanges = gapsBatch.flatMap((gap) => {
      const clampedIntervals = clampIntervals(gap.unfilledIntervals, {
        gte: new Date(start),
        lte: new Date(end),
      });
      return clampedIntervals.map(({ gte, lte }) => ({
        start: gte.toISOString(),
        end: lte.toISOString(),
      }));
    });

    if (gapRanges.length === 0) {
      continue;
    }

    schedulingPayloads.push({
      ruleId,
      ranges: gapRanges,
    });
  }

  if (schedulingPayloads.length === 0) {
    return { results: [] };
  }
  try {
    // Schedule all backfills in a single bulk operation
    const scheduleResults = await scheduleBackfill(context, schedulingPayloads, gaps, gapsByRuleId);
    console.log('scheduleResults', JSON.stringify(scheduleResults));
    for (let i = 0; i < scheduleResults.length; i++) {
      const result = scheduleResults[i];
      const ruleId = schedulingPayloads[i].ruleId;
      const gapsBatch = gapsByRuleId.get(ruleId) || [];

      if ('error' in result) {
        const backfillError = result.error;
        results.push({
          ruleId,
          processedGaps: gapsBatch.length,
          status: 'error',
          error: backfillError.message,
        });
      } else {
        logProcessedAsAuditEvent(context, { id: ruleId, name: ruleId });
        results.push({
          ruleId,
          processedGaps: gapsBatch.length,
          status: 'success',
        });
      }
    }

    return { results };
  } catch (error) {
    console.log('error scheduleBackfill', JSON.stringify(error));
    return { results: [] };
  }
};
