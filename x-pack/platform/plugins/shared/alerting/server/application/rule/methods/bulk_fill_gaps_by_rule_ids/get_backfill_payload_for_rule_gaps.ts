/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEventLogClient } from '@kbn/event-log-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { ScheduleBackfillParams } from '../../../backfill/methods/schedule/types';
import { denormalizeInterval, clampIntervals } from '../../../../lib/rule_gaps/gap/interval_utils';
import type { BulkFillGapsByRuleIdsParams } from './types';
import { processAllGapsInTimeRange } from '../../../../lib/rule_gaps/process_all_gaps_in_time_range';
import type { Gap } from '../../../../lib/rule_gaps/gap';

interface GetBackfillPayloadForRule {
  ruleId: string;
  range: BulkFillGapsByRuleIdsParams['range'];
}

export const getBackfillPayloadForRuleGaps = async (
  eventLogClient: IEventLogClient,
  logger: Logger,
  { ruleId, range }: GetBackfillPayloadForRule
) => {
  const rangesToBackfill: ScheduleBackfillParams[0]['ranges'] = [];
  const { start, end } = range;

  const processGapsBatch = (gaps: Gap[]) => {
    const gapRanges = gaps.flatMap((gap) => {
      const unfilledIntervals = gap.unfilledIntervals.map(denormalizeInterval);
      const clampedIntervals = clampIntervals(unfilledIntervals, { gte: start, lte: end });
      return clampedIntervals.map(({ gte, lte }) => {
        return {
          start: gte,
          end: lte,
        };
      });
    });

    rangesToBackfill.push(...gapRanges);
  };

  await processAllGapsInTimeRange({ ruleId, start, end, eventLogClient, logger, processGapsBatch });

  const backfillRequestPayload: ScheduleBackfillParams[0] = {
    ruleId,
    ranges: rangesToBackfill,
  };

  return backfillRequestPayload;
};
