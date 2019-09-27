/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../common/http_api/log_analysis';

type LogRateLineSeriesDataPoint = [number, number | null];
type LogRateLineSeries = LogRateLineSeriesDataPoint[];
type LogRateAnomalySeriesDataPoint = [number, number];
type LogRateAnomalySeries = LogRateAnomalySeriesDataPoint[];

export const useLogEntryRateGraphData = ({
  data,
}: {
  data: GetLogEntryRateSuccessResponsePayload['data'] | null;
}) => {
  const lineSeries: LogRateLineSeries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.histogramBuckets.map(bucket => [
      bucket.startTime,
      bucket.dataSets.length > 0 ? bucket.dataSets[0].averageActualLogEntryRate : null,
    ]);
  }, [data]);

  const anomalySeries: LogRateAnomalySeries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.histogramBuckets.reduce<Array<[number, number]>>((acc, bucket) => {
      if (bucket.dataSets.length === 0) {
        return [];
      }

      return [
        ...acc,
        ...bucket.dataSets[0].anomalies.map(
          anomaly => [anomaly.startTime, anomaly.actualLogEntryRate] as [number, number]
        ),
      ];
    }, []);
  }, [data]);

  return {
    lineSeries,
    anomalySeries,
  };
};
