/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis';

export const useLogEntryRateGraphData = ({
  data,
}: {
  data: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const areaSeries = useMemo(() => {
    if (!data || (data && data.histogramBuckets && !data.histogramBuckets.length)) {
      return [];
    }
    return data.histogramBuckets.reduce((acc: any, bucket) => {
      acc.push({
        x: bucket.startTime,
        min: bucket.modelLowerBoundStats.min,
        max: bucket.modelUpperBoundStats.max,
      });
      return acc;
    }, []);
  }, [data]);

  const lineSeries = useMemo(() => {
    if (!data || (data && data.histogramBuckets && !data.histogramBuckets.length)) {
      return [];
    }
    return data.histogramBuckets.reduce((acc: any, bucket) => {
      acc.push([bucket.startTime, bucket.logEntryRateStats.avg]);
      return acc;
    }, []);
  }, [data]);

  return {
    areaSeries,
    lineSeries,
  };
};
