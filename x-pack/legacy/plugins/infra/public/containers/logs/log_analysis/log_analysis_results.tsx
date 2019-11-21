/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useMemo, useEffect } from 'react';

import { useLogEntryRate } from './log_entry_rate';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../common/http_api/log_analysis';

type PartitionBucket = {
  startTime: number;
} & GetLogEntryRateSuccessResponsePayload['data']['histogramBuckets'][0]['partitions'][0];

type PartitionRecord = Record<
  string,
  { buckets: PartitionBucket[]; topAnomalyScore: number; totalNumberOfLogEntries: number }
>;

export interface LogRateResults {
  bucketDuration: number;
  totalNumberOfLogEntries: number;
  histogramBuckets: GetLogEntryRateSuccessResponsePayload['data']['histogramBuckets'];
  partitionBuckets: PartitionRecord;
}

export const useLogAnalysisResults = ({
  sourceId,
  startTime,
  endTime,
  bucketDuration = 15 * 60 * 1000,
  lastRequestTime,
}: {
  sourceId: string;
  startTime: number;
  endTime: number;
  bucketDuration?: number;
  lastRequestTime: number;
}) => {
  const { isLoading: isLoadingLogEntryRate, logEntryRate, getLogEntryRate } = useLogEntryRate({
    sourceId,
    startTime,
    endTime,
    bucketDuration,
  });

  const isLoading = useMemo(() => isLoadingLogEntryRate, [isLoadingLogEntryRate]);

  useEffect(() => {
    getLogEntryRate();
  }, [sourceId, startTime, endTime, bucketDuration, lastRequestTime]);

  const logRateResults: LogRateResults | null = useMemo(() => {
    if (logEntryRate) {
      return {
        bucketDuration: logEntryRate.bucketDuration,
        totalNumberOfLogEntries: logEntryRate.totalNumberOfLogEntries,
        histogramBuckets: logEntryRate.histogramBuckets,
        partitionBuckets: formatLogEntryRateResultsByPartition(logEntryRate),
      };
    } else {
      return null;
    }
  }, [logEntryRate]);

  return {
    isLoading,
    logRateResults,
  };
};

export const LogAnalysisResults = createContainer(useLogAnalysisResults);

const formatLogEntryRateResultsByPartition = (
  results: GetLogEntryRateSuccessResponsePayload['data']
): PartitionRecord => {
  const partitionedBuckets = results.histogramBuckets.reduce<
    Record<string, { buckets: PartitionBucket[] }>
  >((partitionResults, bucket) => {
    return bucket.partitions.reduce<Record<string, { buckets: PartitionBucket[] }>>(
      (_partitionResults, partition) => {
        return {
          ..._partitionResults,
          [partition.partitionId]: {
            buckets: _partitionResults[partition.partitionId]
              ? [
                  ..._partitionResults[partition.partitionId].buckets,
                  { startTime: bucket.startTime, ...partition },
                ]
              : [{ startTime: bucket.startTime, ...partition }],
          },
        };
      },
      partitionResults
    );
  }, {});

  const resultsByPartition: PartitionRecord = {};

  Object.entries(partitionedBuckets).map(([key, value]) => {
    const anomalyScores = value.buckets.reduce((scores: number[], bucket) => {
      return [...scores, bucket.maximumAnomalyScore];
    }, []);
    const totalNumberOfLogEntries = value.buckets.reduce((total, bucket) => {
      return (total += bucket.numberOfLogEntries);
    }, 0);
    resultsByPartition[key] = {
      topAnomalyScore: Math.max(...anomalyScores),
      totalNumberOfLogEntries,
      buckets: value.buckets,
    };
  });

  return resultsByPartition;
};
