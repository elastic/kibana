/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis';

interface LogRateAreaSeriesDataPoint {
  x: number;
  min: number | null;
  max: number | null;
}
type LogRateAreaSeries = LogRateAreaSeriesDataPoint[];
type LogRateLineSeriesDataPoint = [number, number | null];
type LogRateLineSeries = LogRateLineSeriesDataPoint[];
type LogRateAnomalySeriesDataPoint = [number, number];
type LogRateAnomalySeries = LogRateAnomalySeriesDataPoint[];

export const useLogEntryRateGraphData = ({
  data,
}: {
  data: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const areaSeries: LogRateAreaSeries = useMemo(() => {
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

  const lineSeries: LogRateLineSeries = useMemo(() => {
    if (!data || (data && data.histogramBuckets && !data.histogramBuckets.length)) {
      return [];
    }
    return data.histogramBuckets.reduce((acc: any, bucket) => {
      acc.push([bucket.startTime, bucket.logEntryRateStats.avg]);
      return acc;
    }, []);
  }, [data]);

  const anomalySeries: LogRateAnomalySeries = useMemo(() => {
    if (!data || (data && data.histogramBuckets && !data.histogramBuckets.length)) {
      return [];
    }
    return data.histogramBuckets.reduce((acc: any, bucket) => {
      if (bucket.anomalies.length > 0) {
        bucket.anomalies.forEach(anomaly => {
          acc.push([anomaly.startTime, anomaly.actualLogEntryRate]);
        });
        return acc;
      } else {
        return acc;
      }
    }, []);
  }, [data]);

  return {
    areaSeries,
    lineSeries,
    anomalySeries,
  };
};
