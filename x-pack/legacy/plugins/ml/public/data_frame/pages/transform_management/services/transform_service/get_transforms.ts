/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../../../../../services/ml_api_service';
import {
  DataFrameTransformListRow,
  DataFrameTransformStats,
  DATA_FRAME_MODE,
  isDataFrameTransformStats,
  DataFrameTransformPivotConfig,
  refreshTransformList$,
  REFRESH_TRANSFORM_LIST_STATE,
} from '../../../../common';

interface GetDataFrameTransformsResponse {
  count: number;
  transforms: DataFrameTransformPivotConfig[];
}

interface GetDataFrameTransformsStatsResponseOk {
  node_failures?: object;
  count: number;
  transforms: DataFrameTransformStats[];
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

export type GetTransforms = (forceRefresh?: boolean) => void;

export const getTransformsFactory = (
  setTransforms: React.Dispatch<React.SetStateAction<DataFrameTransformListRow[]>>,
  setErrorMessage: React.Dispatch<
    React.SetStateAction<GetDataFrameTransformsStatsResponseError | undefined>
  >,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  blockRefresh: boolean
): GetTransforms => {
  let concurrentLoads = 0;

  const getTransforms = async (forceRefresh = false) => {
    if (forceRefresh === true || blockRefresh === false) {
      refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.LOADING);
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      try {
        const transformConfigs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
        const transformStats: GetDataFrameTransformsStatsResponse = await ml.dataFrame.getDataFrameTransformsStats();

        const tableRows = transformConfigs.transforms.reduce(
          (reducedtableRows, config) => {
            const stats = isGetDataFrameTransformsStatsResponseOk(transformStats)
              ? transformStats.transforms.find(d => config.id === d.id)
              : undefined;

            // A newly created transform might not have corresponding stats yet.
            // If that's the case we just skip the transform and don't add it to the transform list yet.
            if (!isDataFrameTransformStats(stats)) {
              return reducedtableRows;
            }

            // Table with expandable rows requires `id` on the outer most level
            reducedtableRows.push({
              id: config.id,
              config,
              mode:
                typeof config.sync !== 'undefined'
                  ? DATA_FRAME_MODE.CONTINUOUS
                  : DATA_FRAME_MODE.BATCH,
              stats,
            });
            return reducedtableRows;
          },
          [] as DataFrameTransformListRow[]
        );

        setTransforms(tableRows);
        setErrorMessage(undefined);
        setIsInitialized(true);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
      } catch (e) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.ERROR);
        refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.IDLE);
        setTransforms([]);
        setErrorMessage(e);
        setIsInitialized(true);
      }
      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getTransforms(true);
        return;
      }
    }
  };

  return getTransforms;
};
