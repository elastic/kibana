/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { RectAnnotationDatum } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { AnomaliesChart } from './chart';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';

export const AnomaliesTableExpandedRow: React.FunctionComponent<{
  partitionId: string;
  topAnomalyScore: number;
  results: GetLogEntryRateSuccessResponsePayload['data'];
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}> = ({ results, timeRange, setTimeRange, topAnomalyScore, partitionId }) => {
  const logEntryRateSeries = useMemo(
    () =>
      results && results.histogramBuckets
        ? results.histogramBuckets.reduce<Array<{ time: number; value: number }>>(
            (buckets, bucket) => {
              const partitionResults = bucket.partitions.find(partition => {
                return partition.partitionId === partitionId;
              });
              if (!partitionResults) {
                return buckets;
              }
              return [
                ...buckets,
                {
                  time: bucket.startTime,
                  value: partitionResults.averageActualLogEntryRate,
                },
              ];
            },
            []
          )
        : [],
    [results]
  );
  // TODO: Split into various colours based on severity scoring
  const anomalyAnnotations = useMemo(
    () =>
      results && results.histogramBuckets
        ? results.histogramBuckets.reduce<RectAnnotationDatum[]>((annotatedBuckets, bucket) => {
            const partitionResults = bucket.partitions.find(partition => {
              return partition.partitionId === partitionId;
            });
            if (!partitionResults || !partitionResults.maximumAnomalyScore) {
              return annotatedBuckets;
            }
            return [
              ...annotatedBuckets,
              {
                coordinates: {
                  x0: bucket.startTime,
                  x1: bucket.startTime + results.bucketDuration,
                },
                details: i18n.translate(
                  'xpack.infra.logs.analysis.partitionMaxAnomalyScoreAnnotationLabel',
                  {
                    defaultMessage: 'Anomaly score: {maxAnomalyScore}',
                    values: {
                      maxAnomalyScore: Number(partitionResults.maximumAnomalyScore).toFixed(0),
                    },
                  }
                ),
              },
            ];
          }, [])
        : [],
    [results]
  );
  return (
    <AnomaliesChart
      chartId={`${partitionId}-anomalies`}
      timeRange={timeRange}
      setTimeRange={setTimeRange}
      series={logEntryRateSeries}
      annotations={anomalyAnnotations}
    />
  );
};
