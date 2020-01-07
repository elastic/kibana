/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import {
  GetLogEntryCategoriesSuccessResponsePayload,
  GetLogEntryCategoryDatasetsSuccessResponsePayload,
} from '../../../../common/http_api/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetTopLogEntryCategoriesAPI } from './service_calls/get_top_log_entry_categories';
import { callGetLogEntryCategoryDatasetsAPI } from './service_calls/get_log_entry_category_datasets';

type TopLogEntryCategories = GetLogEntryCategoriesSuccessResponsePayload['data']['categories'];
type LogEntryCategoryDatasets = GetLogEntryCategoryDatasetsSuccessResponsePayload['data']['datasets'];

export const useLogEntryCategoriesResults = ({
  sourceId,
  startTime,
  endTime,
  categoriesCount,
  onGetTopLogEntryCategoriesError,
  onGetLogEntryCategoryDatasetsError,
}: {
  sourceId: string;
  startTime: number;
  endTime: number;
  categoriesCount: number;
  onGetTopLogEntryCategoriesError?: (error: Error) => void;
  onGetLogEntryCategoryDatasetsError?: (error: Error) => void;
}) => {
  const [topLogEntryCategories, setTopLogEntryCategories] = useState<TopLogEntryCategories>([]);
  const [logEntryCategoryDatasets, setLogEntryCategoryDatasets] = useState<
    LogEntryCategoryDatasets
  >([]);

  const [getTopLogEntryCategoriesRequest, getTopLogEntryCategories] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callGetTopLogEntryCategoriesAPI(sourceId, startTime, endTime, categoriesCount);
      },
      onResolve: ({ data: { categories } }) => {
        setTopLogEntryCategories(categories);
      },
      onReject: error => {
        if (error instanceof Error && onGetTopLogEntryCategoriesError) {
          onGetTopLogEntryCategoriesError(error);
        }
      },
    },
    [sourceId, startTime, endTime, categoriesCount]
  );

  const [getLogEntryCategoryDatasetsRequest, getLogEntryCategoryDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callGetLogEntryCategoryDatasetsAPI(sourceId, startTime, endTime);
      },
      onResolve: ({ data: { datasets } }) => {
        setLogEntryCategoryDatasets(datasets);
      },
      onReject: error => {
        if (error instanceof Error && onGetLogEntryCategoryDatasetsError) {
          onGetLogEntryCategoryDatasetsError(error);
        }
      },
    },
    [sourceId, startTime, endTime, categoriesCount]
  );

  const isLoadingTopLogEntryCategories = useMemo(
    () => getTopLogEntryCategoriesRequest.state === 'pending',
    [getTopLogEntryCategoriesRequest.state]
  );

  const isLoadingLogEntryCategoryDatasets = useMemo(
    () => getLogEntryCategoryDatasetsRequest.state === 'pending',
    [getLogEntryCategoryDatasetsRequest.state]
  );

  const isLoading = useMemo(
    () => isLoadingTopLogEntryCategories || isLoadingLogEntryCategoryDatasets,
    [isLoadingLogEntryCategoryDatasets, isLoadingTopLogEntryCategories]
  );

  return {
    getLogEntryCategoryDatasets,
    getTopLogEntryCategories,
    isLoading,
    isLoadingLogEntryCategoryDatasets,
    isLoadingTopLogEntryCategories,
    logEntryCategoryDatasets,
    topLogEntryCategories,
  };
};

// const formatLogEntryRateResultsByPartition = (
//   results: GetLogEntryRateSuccessResponsePayload['data']
// ): PartitionRecord => {
//   const partitionedBuckets = results.histogramBuckets.reduce<
//     Record<string, { buckets: PartitionBucket[] }>
//   >((partitionResults, bucket) => {
//     return bucket.partitions.reduce<Record<string, { buckets: PartitionBucket[] }>>(
//       (_partitionResults, partition) => {
//         return {
//           ..._partitionResults,
//           [partition.partitionId]: {
//             buckets: _partitionResults[partition.partitionId]
//               ? [
//                   ..._partitionResults[partition.partitionId].buckets,
//                   { startTime: bucket.startTime, ...partition },
//                 ]
//               : [{ startTime: bucket.startTime, ...partition }],
//           },
//         };
//       },
//       partitionResults
//     );
//   }, {});

//   const resultsByPartition: PartitionRecord = {};

//   Object.entries(partitionedBuckets).map(([key, value]) => {
//     const anomalyScores = value.buckets.reduce((scores: number[], bucket) => {
//       return [...scores, bucket.maximumAnomalyScore];
//     }, []);
//     const totalNumberOfLogEntries = value.buckets.reduce((total, bucket) => {
//       return (total += bucket.numberOfLogEntries);
//     }, 0);
//     resultsByPartition[key] = {
//       topAnomalyScore: Math.max(...anomalyScores),
//       totalNumberOfLogEntries,
//       buckets: value.buckets,
//     };
//   });

//   return resultsByPartition;
// };
