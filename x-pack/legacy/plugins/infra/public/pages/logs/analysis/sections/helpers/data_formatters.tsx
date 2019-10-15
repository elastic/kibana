/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RectAnnotationDatum } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';

export type MLSeverityScoreCategories = 'warning' | 'minor' | 'major' | 'critical';
type MLSeverityScores = Record<MLSeverityScoreCategories, number>;
const ML_SEVERITY_SCORES: MLSeverityScores = {
  warning: 3,
  minor: 25,
  major: 50,
  critical: 75,
};

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
        return (
          partition.partitionId === partitionId ||
          (partition.partitionId === '' && partitionId === 'unknown')
        );
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
  return results.histogramBuckets.reduce<Record<MLSeverityScoreCategories, RectAnnotationDatum[]>>(
    (annotatedBucketsBySeverity, bucket) => {
      const partitionResults = bucket.partitions.find(partition => {
        return (
          partition.partitionId === partitionId ||
          (partition.partitionId === '' && partitionId === 'unknown')
        );
      });
      const severityCategory = partitionResults
        ? getSeverityCategoryForScore(partitionResults.maximumAnomalyScore)
        : null;
      if (!partitionResults || !partitionResults.maximumAnomalyScore || !severityCategory) {
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
                  maxAnomalyScore: formatAnomalyScore(partitionResults.maximumAnomalyScore),
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
  results: GetLogEntryRateSuccessResponsePayload['data'],
  partitionId: string
) => {
  return results.histogramBuckets.reduce<number>((sumPartitionNumberOfLogEntries, bucket) => {
    const partitionResults = bucket.partitions.find(partition => {
      return (
        partition.partitionId === partitionId ||
        (partition.partitionId === '' && partitionId === 'unknown')
      );
    });
    if (!partitionResults || !partitionResults.numberOfLogEntries) {
      return sumPartitionNumberOfLogEntries;
    } else {
      return (sumPartitionNumberOfLogEntries += partitionResults.numberOfLogEntries);
    }
  }, 0);
};

export const getAnnotationsForAll = (results: GetLogEntryRateSuccessResponsePayload['data']) => {
  return results.histogramBuckets.reduce<Record<MLSeverityScoreCategories, RectAnnotationDatum[]>>(
    (annotatedBucketsBySeverity, bucket) => {
      const maxAnomalyScoresByPartition = bucket.partitions.reduce<
        Array<{ partitionId: string; maximumAnomalyScore: number }>
      >((bucketMaxAnomalyScoresByPartition, partition) => {
        if (!getSeverityCategoryForScore(partition.maximumAnomalyScore)) {
          return bucketMaxAnomalyScoresByPartition;
        }
        return [
          ...bucketMaxAnomalyScoresByPartition,
          {
            partitionId: partition.partitionId ? partition.partitionId : 'unknown',
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

export const getTopAnomalyScoreAcrossAllPartitions = (
  results: GetLogEntryRateSuccessResponsePayload['data']
) => {
  const allMaxScores = results.histogramBuckets.reduce<number[]>((scores, bucket) => {
    const bucketMaxScores = bucket.partitions.reduce<number[]>((bucketScores, partition) => {
      return [...bucketScores, partition.maximumAnomalyScore];
    }, []);
    return [...scores, ...bucketMaxScores];
  }, []);
  return Math.max(...allMaxScores);
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
