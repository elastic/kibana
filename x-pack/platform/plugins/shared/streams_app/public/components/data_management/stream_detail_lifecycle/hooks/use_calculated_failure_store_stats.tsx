/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useMemo } from 'react';
import type { FailureStoreStatsResponse } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { TimeState } from '@kbn/es-query';
import type { useAggregations } from './use_ingestion_rate';

export interface CalculatedFailureStoreStats {
  bytesPerDoc: number;
  bytesPerDay: number;
}

export const useCalculatedFailureStoreStats = ({
  stats,
  timeState,
  aggregations,
}: {
  stats?: FailureStoreStatsResponse;
  timeState: TimeState;
  aggregations?: ReturnType<typeof useAggregations>['aggregations'];
}): CalculatedFailureStoreStats | undefined => {
  return useMemo(() => {
    if (!stats || !aggregations?.buckets) {
      return undefined;
    }

    const rangeInDays = moment(timeState.end).diff(moment(timeState.start), 'days', true);
    const countRange = aggregations.buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);

    const bytesPerDoc = stats.count && stats.size ? stats.size / stats.count : 0;
    const perDayDocs = countRange ? countRange / rangeInDays : 0;
    const bytesPerDay = bytesPerDoc * perDayDocs;

    return {
      bytesPerDoc,
      bytesPerDay,
    };
  }, [stats, timeState.start, timeState.end, aggregations?.buckets]);
};
