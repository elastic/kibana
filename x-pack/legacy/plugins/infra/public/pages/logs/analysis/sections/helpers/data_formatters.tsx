/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotationDatum } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';

export const getLogEntryRatePartitionedSeries = (
  results: GetLogEntryRateSuccessResponsePayload['data']
) => {
  return results.histogramBuckets.reduce<Array<{ group: string; time: number; value: number }>>(
    (buckets, bucket) => {
      return [
        ...buckets,
        ...bucket.partitions.map(partition => ({
          group: partition.partitionId === '' ? 'unknown' : partition.partitionId,
          time: bucket.startTime,
          value: partition.averageActualLogEntryRate,
        })),
      ];
    },
    []
  );
};

export const getLogEntryRateCombinedSeries = (
  results: GetLogEntryRateSuccessResponsePayload['data']
) => {
  return results.histogramBuckets.reduce<Array<{ time: number; value: number }>>(
    (buckets, bucket) => {
      return [
        ...buckets,
        {
          time: bucket.startTime,
          value: bucket.partitions.reduce((accumulatedValue, partition) => {
            return accumulatedValue + partition.averageActualLogEntryRate;
          }, 0),
        },
      ];
    },
    []
  );
};

export const getLogEntryRateSeriesForPartition = (
  results: GetLogEntryRateSuccessResponsePayload['data'],
  partitionId: string
) => {
  return results.histogramBuckets.reduce<Array<{ time: number; value: number }>>(
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
  );
};

export const getTopAnomalyScoresByPartition = (
  results: GetLogEntryRateSuccessResponsePayload['data']
) => {
  return results.histogramBuckets.reduce<Record<string, number>>((topScores, bucket) => {
    bucket.partitions.forEach(partition => {
      if (partition.maximumAnomalyScore > 0) {
        topScores = {
          ...topScores,
          [partition.partitionId]:
            !topScores[partition.partitionId] ||
            partition.maximumAnomalyScore > topScores[partition.partitionId]
              ? partition.maximumAnomalyScore
              : topScores[partition.partitionId],
        };
      }
    });
    return topScores;
  }, {});
};

export const getAnnotationsForPartition = (
  results: GetLogEntryRateSuccessResponsePayload['data'],
  partitionId: string
) => {
  return results.histogramBuckets.reduce<RectAnnotationDatum[]>((annotatedBuckets, bucket) => {
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
  }, []);
};

export const getAnnotationsForAll = (results: GetLogEntryRateSuccessResponsePayload['data']) => {
  return results.histogramBuckets.reduce<RectAnnotationDatum[]>((annotatedBuckets, bucket) => {
    const sumPartitionMaxAnomalyScores = bucket.partitions.reduce<number>((scoreSum, partition) => {
      return scoreSum + partition.maximumAnomalyScore;
    }, 0);

    if (sumPartitionMaxAnomalyScores === 0) {
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
          'xpack.infra.logs.analysis.logRateBucketMaxAnomalyScoreAnnotationLabel',
          {
            defaultMessage: 'Anomaly score: {sumPartitionMaxAnomalyScores}',
            values: {
              sumPartitionMaxAnomalyScores: Number(sumPartitionMaxAnomalyScores).toFixed(0),
            },
          }
        ),
      },
    ];
  }, []);
};
