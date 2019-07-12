/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../../../../../../services/ml_api_service';
import {
  DataFrameTransformWithId,
  JobId,
  refreshTransformList$,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../../../../../common';

import { DataFrameJobListRow, DataFrameJobState, DataFrameJobStats } from '../common';

interface DataFrameJobStateStats {
  id: JobId;
  checkpointing: object;
  state: DataFrameJobState;
  stats: DataFrameJobStats;
}

interface GetDataFrameTransformsResponse {
  count: number;
  transforms: DataFrameTransformWithId[];
}

interface GetDataFrameTransformsStatsResponseOk {
  node_failures?: object;
  count: number;
  transforms: DataFrameJobStateStats[];
}

const isGetDataFrameTransformsStatsResponseOk = (
  arg: any
): arg is GetDataFrameTransformsStatsResponseOk => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'transforms') &&
    Array.isArray(arg.transforms)
  );
};

interface GetDataFrameTransformsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

type GetDataFrameTransformsStatsResponse =
  | GetDataFrameTransformsStatsResponseOk
  | GetDataFrameTransformsStatsResponseError;

export type GetJobs = (forceRefresh?: boolean) => void;

export const getJobsFactory = (
  setDataFrameJobs: React.Dispatch<React.SetStateAction<DataFrameJobListRow[]>>,
  setErrorMessage: React.Dispatch<
    React.SetStateAction<GetDataFrameTransformsStatsResponseError | undefined>
  >,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  blockRefresh: boolean
): GetJobs => {
  let concurrentLoads = 0;

  const getJobs = async (forceRefresh = false) => {
    if (forceRefresh === true || blockRefresh === false) {
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.LOADING);
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      try {
        const jobConfigs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
        const jobStats: GetDataFrameTransformsStatsResponse = await ml.dataFrame.getDataFrameTransformsStats();

        const tableRows = jobConfigs.transforms.reduce(
          (reducedtableRows, config) => {
            const stats = isGetDataFrameTransformsStatsResponseOk(jobStats)
              ? jobStats.transforms.find(d => config.id === d.id)
              : undefined;

            // A newly created job might not have corresponding stats yet.
            // If that's the case we just skip the job and don't add it to the jobs list yet.
            if (stats === undefined) {
              return reducedtableRows;
            }
            // Table with expandable rows requires `id` on the outer most level
            reducedtableRows.push({
              config,
              id: config.id,
              checkpointing: stats.checkpointing,
              state: stats.state,
              stats: stats.stats,
            });
            return reducedtableRows;
          },
          [] as DataFrameJobListRow[]
        );

        setDataFrameJobs(tableRows);
        setErrorMessage(undefined);
        setIsInitialized(true);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
      } catch (e) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.ERROR);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
        setDataFrameJobs([]);
        setErrorMessage(e);
        setIsInitialized(true);
      }
      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getJobs(true);
        return;
      }
    }
  };

  return getJobs;
};
