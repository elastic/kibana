/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { isNumber } from 'lodash';
import type { GapReason, GapReasonType } from '../../../../common/constants';
import { gapReasonType } from '../../../../common/constants';
import { Gap } from '../gap';
import type { StringInterval } from '../../../application/gaps/types/intervals';

type PotentialInterval = { lte?: string; gte?: string } | undefined;
type PotentialGapReason = { type?: string } | undefined;

const normalizeInterval = (interval: PotentialInterval): StringInterval | null => {
  if (!interval?.gte || !interval?.lte) return null;

  return {
    lte: interval.lte,
    gte: interval.gte,
  };
};

const normalizeIntervals = (intervals: PotentialInterval[] | undefined): StringInterval[] =>
  (intervals
    ?.map(normalizeInterval)
    ?.filter((interval) => interval !== null) as StringInterval[]) ?? [];

const validReasonTypes: string[] = Object.values(gapReasonType);

const normalizeReason = (reason: PotentialGapReason): GapReason => {
  if (reason?.type && validReasonTypes.includes(reason.type)) {
    return { type: reason.type as GapReasonType };
  }

  return { type: gapReasonType.RULE_DID_NOT_RUN };
};

/**
 * Transforms event log results into Gap objects
 * Filters out invalid gaps/gaps intervals
 */
export const transformToGap = (events: Pick<QueryEventsBySavedObjectResult, 'data'>): Gap[] => {
  return events?.data
    ?.map((doc) => {
      const gap = doc?.kibana?.alert?.rule?.gap;
      // Filter out deleted gaps in the event that we request them by id.
      // Due to a race condition when we update gaps, we could end up requesting a deleted gap by id
      // Deleted gaps should not be used by Kibana at all because it means that the rule they are associated with has been deleted
      if (!gap || gap.deleted) return null;

      const ruleId = doc.rule?.id;

      if (!ruleId) {
        return null;
      }

      const range = normalizeInterval(gap.range);

      if (!range || !doc['@timestamp']) return null;

      const filledIntervals = normalizeIntervals(gap?.filled_intervals);
      const inProgressIntervals = normalizeIntervals(gap?.in_progress_intervals);
      const reason = normalizeReason(gap?.reason);

      const failedAutoFillAttempts = isNumber(gap?.failed_auto_fill_attempts)
        ? gap!.failed_auto_fill_attempts
        : 0;

      return new Gap({
        ruleId,
        timestamp: doc['@timestamp'],
        range,
        filledIntervals,
        inProgressIntervals,
        updatedAt: gap?.updated_at,
        internalFields: {
          _id: doc._id,
          _index: doc._index,
          _seq_no: doc._seq_no,
          _primary_term: doc._primary_term,
        },
        failedAutoFillAttempts,
        reason,
      });
    })
    .filter((gap): gap is Gap => gap !== null);
};
