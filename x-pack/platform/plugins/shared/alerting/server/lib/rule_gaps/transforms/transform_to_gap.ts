/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { Gap } from '../gap';
import { StringInterval } from '../types';

type PotentialInterval = { lte?: string; gte?: string } | undefined;

const validateInterval = (interval: PotentialInterval): StringInterval | null => {
  if (!interval?.gte || !interval?.lte) return null;

  return {
    lte: interval.lte,
    gte: interval.gte,
  };
};

const validateIntervals = (intervals: PotentialInterval[] | undefined): StringInterval[] =>
  (intervals?.map(validateInterval)?.filter((interval) => interval !== null) as StringInterval[]) ??
  [];

/**
 * Transforms event log results into Gap objects
 * Filters out invalid gaps/gaps intervals
 */
export const transformToGap = (events: Pick<QueryEventsBySavedObjectResult, 'data'>): Gap[] => {
  return events?.data
    ?.map((doc) => {
      const gap = doc?.kibana?.alert?.rule?.gap;
      if (!gap) return null;

      const range = validateInterval(gap.range);

      if (!range || !doc['@timestamp']) return null;

      const filledIntervals = validateIntervals(gap?.filled_intervals);
      const inProgressIntervals = validateIntervals(gap?.in_progress_intervals);

      return new Gap({
        timestamp: doc['@timestamp'],
        range,
        filledIntervals,
        inProgressIntervals,
        internalFields: {
          _id: doc._id,
          _index: doc._index,
          _seq_no: doc._seq_no,
          _primary_term: doc._primary_term,
        },
      });
    })
    .filter((gap): gap is Gap => gap !== null);
};
