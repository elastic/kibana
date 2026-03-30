/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { TimeState } from '@kbn/es-query';

export interface CalculatedStats {
  bytesPerDoc: number;
  bytesPerDay: number;
  perDayDocs: number;
}

export const getCalculatedStats = ({
  stats,
  timeState,
  buckets,
}: {
  stats: { creationDate?: number; totalDocs?: number; sizeBytes?: number };
  timeState: TimeState;
  buckets?: Array<{ key: number; doc_count: number }>;
}): CalculatedStats => {
  if (!buckets) {
    return { bytesPerDoc: 0, bytesPerDay: 0, perDayDocs: 0 };
  }

  const effectiveStart = getEffectiveStart(timeState, stats.creationDate);
  const rangeInDays = moment(timeState.end).diff(effectiveStart, 'days', true);
  const countRange = buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);

  const bytesPerDoc = stats.totalDocs && stats.sizeBytes ? stats.sizeBytes / stats.totalDocs : 0;
  const perDayDocs = countRange ? countRange / rangeInDays : 0;
  const bytesPerDay = bytesPerDoc * perDayDocs;

  return { bytesPerDoc, bytesPerDay, perDayDocs };
};

const getEffectiveStart = (timeState: TimeState, creationDate?: number) => {
  if (creationDate) {
    if (creationDate > timeState.start && creationDate < timeState.end) {
      return creationDate;
    }
  }

  return timeState.start;
};
