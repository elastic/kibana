/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useMemo } from 'react';
import type { DataStreamStatServiceResponse } from '@kbn/dataset-quality-plugin/public';
import type { TimeState } from '@kbn/es-query';
import type { useAggregations } from './use_ingestion_rate';

export interface CalculatedStats {
  bytesPerDoc: number;
  bytesPerDay: number;
}

export const useCalculatedStats = ({
  stats,
  timeState,
  aggregations,
}: {
  stats?: DataStreamStatServiceResponse['dataStreamsStats'][number];
  timeState: TimeState;
  aggregations?: ReturnType<typeof useAggregations>['aggregations'];
}): CalculatedStats | undefined => {
  return useMemo(() => {
    if (!stats || !aggregations?.buckets) {
      return undefined;
    }

    const effectiveStart = stats.creationDate
      ? moment.max(moment(timeState.start), moment(stats.creationDate))
      : moment(timeState.start);
    const rangeInDays = moment(timeState.end).diff(effectiveStart, 'days', true);
    const countRange = aggregations.buckets.reduce((sum, bucket) => sum + bucket.doc_count, 0);

    const bytesPerDoc = stats.totalDocs && stats.sizeBytes ? stats.sizeBytes / stats.totalDocs : 0;
    const perDayDocs = countRange ? countRange / rangeInDays : 0;
    const bytesPerDay = bytesPerDoc * perDayDocs;

    return {
      bytesPerDoc,
      bytesPerDay,
    };
  }, [stats, timeState.start, timeState.end, aggregations?.buckets]);
};
