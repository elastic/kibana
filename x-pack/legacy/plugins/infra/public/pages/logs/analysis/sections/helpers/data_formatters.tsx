/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotationDatum } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LogRateResults } from '../../../../../containers/logs/log_analysis/log_analysis_results';

export type MLSeverityScoreCategories = 'warning' | 'minor' | 'major' | 'critical';
type MLSeverityScores = Record<MLSeverityScoreCategories, number>;
const ML_SEVERITY_SCORES: MLSeverityScores = {
  warning: 3,
  minor: 25,
  major: 50,
  critical: 75,
};

export const getLogEntryRatePartitionedSeries = (results: LogRateResults) => {
  return results.histogramBuckets.reduce<Array<{ group: string; time: number; value: number }>>(
    (buckets, bucket) => {
      return [
        ...buckets,
        ...bucket.partitions.map(partition => ({
          group: getFriendlyNameForPartitionId(partition.partitionId),
          time: bucket.startTime,
          value: partition.averageActualLogEntryRate,
        })),
      ];
    },
    []
  );
};

export const getLogEntryRateCombinedSeries = (results: LogRateResults) => {
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

export const getLogEntryRateSeriesForPartition = (results: LogRateResults, partitionId: string) => {
  return results.partitionBuckets[partitionId].buckets.reduce<
    Array<{ time: number; value: number }>
  >((buckets, bucket) => {
    return [
      ...buckets,
      {
        time: bucket.startTime,
        value: bucket.averageActualLogEntryRate,
      },
    ];
  }, []);
};

export const getAnnotationsForPartition = (results: LogRateResults, partitionId: string) => {
  return results.partitionBuckets[partitionId].buckets.reduce<
    Record<MLSeverityScoreCategories, RectAnnotationDatum[]>
  >(
    (annotatedBucketsBySeverity, bucket) => {
      const severityCategory = getSeverityCategoryForScore(bucket.maximumAnomalyScore);
      if (!severityCategory) {
        return annotatedBucketsBySeverity;
      }

      return {
        ...annotatedBucketsBySeverity,
        [severityCategory]: [
          ...annotatedBucketsBySeverity[severityCategory],
          {
            coordinates: {
              x0: bucket.startTime,
              x1: bucket.startTime + results.bucketDuration,
            },
            details: i18n.translate(
              'xpack.infra.logs.analysis.partitionMaxAnomalyScoreAnnotationLabel',
              {
                defaultMessage: 'Max anomaly score: {maxAnomalyScore}',
                values: {
                  maxAnomalyScore: formatAnomalyScore(bucket.maximumAnomalyScore),
                },
              }
            ),
          },
        ],
      };
    },
    {
      warning: [],
      minor: [],
      major: [],
      critical: [],
    }
  );
};

export const getTotalNumberOfLogEntriesForPartition = (
  results: LogRateResults,
  partitionId: string
) => {
  return results.partitionBuckets[partitionId].totalNumberOfLogEntries;
};

export const getAnnotationsForAll = (results: LogRateResults) => {
  return results.histogramBuckets.reduce<Record<MLSeverityScoreCategories, RectAnnotationDatum[]>>(
    (annotatedBucketsBySeverity, bucket) => {
      const maxAnomalyScoresByPartition = bucket.partitions.reduce<
        Array<{ partitionName: string; maximumAnomalyScore: number }>
      >((bucketMaxAnomalyScoresByPartition, partition) => {
        if (!getSeverityCategoryForScore(partition.maximumAnomalyScore)) {
          return bucketMaxAnomalyScoresByPartition;
        }
        return [
          ...bucketMaxAnomalyScoresByPartition,
          {
            partitionName: getFriendlyNameForPartitionId(partition.partitionId),
            maximumAnomalyScore: formatAnomalyScore(partition.maximumAnomalyScore),
          },
        ];
      }, []);

      if (maxAnomalyScoresByPartition.length === 0) {
        return annotatedBucketsBySeverity;
      }
      const severityCategory = getSeverityCategoryForScore(
        Math.max(
          ...maxAnomalyScoresByPartition.map(partitionScore => partitionScore.maximumAnomalyScore)
        )
      );
      if (!severityCategory) {
        return annotatedBucketsBySeverity;
      }
      const sortedMaxAnomalyScoresByPartition = maxAnomalyScoresByPartition.sort(
        (a, b) => b.maximumAnomalyScore - a.maximumAnomalyScore
      );
      return {
        ...annotatedBucketsBySeverity,
        [severityCategory]: [
          ...annotatedBucketsBySeverity[severityCategory],
          {
            coordinates: {
              x0: bucket.startTime,
              x1: bucket.startTime + results.bucketDuration,
            },
            details: JSON.stringify({
              anomalyScoresByPartition: sortedMaxAnomalyScoresByPartition,
            }),
          },
        ],
      };
    },
    {
      warning: [],
      minor: [],
      major: [],
      critical: [],
    }
  );
};

export const getTopAnomalyScoreAcrossAllPartitions = (results: LogRateResults) => {
  const allTopScores = Object.values(results.partitionBuckets).reduce(
    (scores: number[], partition) => {
      return [...scores, partition.topAnomalyScore];
    },
    []
  );
  return Math.max(...allTopScores);
};

const getSeverityCategoryForScore = (score: number): MLSeverityScoreCategories | undefined => {
  if (score >= ML_SEVERITY_SCORES.critical) {
    return 'critical';
  } else if (score >= ML_SEVERITY_SCORES.major) {
    return 'major';
  } else if (score >= ML_SEVERITY_SCORES.minor) {
    return 'minor';
  } else if (score >= ML_SEVERITY_SCORES.warning) {
    return 'warning';
  } else {
    // Category is too low to include
    return undefined;
  }
};

export const formatAnomalyScore = (score: number) => {
  return Math.round(score);
};

export const getFriendlyNameForPartitionId = (partitionId: string) => {
  return partitionId !== '' ? partitionId : 'unknown';
};
