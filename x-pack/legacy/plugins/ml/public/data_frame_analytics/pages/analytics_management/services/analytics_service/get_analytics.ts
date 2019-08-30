/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ml } from '../../../../../services/ml_api_service';
import {
  DataFrameAnalyticsConfig,
  refreshAnalyticsList$,
  REFRESH_ANALYTICS_LIST_STATE,
} from '../../../../common';

import {
  DataFrameAnalyticsListRow,
  DataFrameAnalyticsStats,
  DATA_FRAME_MODE,
  isDataFrameAnalyticsStats,
} from '../../components/analytics_list/common';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

interface GetDataFrameAnalyticsStatsResponseOk {
  node_failures?: object;
  count: number;
  data_frame_analytics: DataFrameAnalyticsStats[];
}

const isGetDataFrameAnalyticsStatsResponseOk = (
  arg: any
): arg is GetDataFrameAnalyticsStatsResponseOk => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'data_frame_analytics') &&
    Array.isArray(arg.data_frame_analytics)
  );
};

interface GetDataFrameAnalyticsStatsResponseError {
  statusCode: number;
  error: string;
  message: string;
}

type GetDataFrameAnalyticsStatsResponse =
  | GetDataFrameAnalyticsStatsResponseOk
  | GetDataFrameAnalyticsStatsResponseError;

export type GetAnalytics = (forceRefresh?: boolean) => void;

export const getAnalyticsFactory = (
  setAnalytics: React.Dispatch<React.SetStateAction<DataFrameAnalyticsListRow[]>>,
  setErrorMessage: React.Dispatch<
    React.SetStateAction<GetDataFrameAnalyticsStatsResponseError | undefined>
  >,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  blockRefresh: boolean
): GetAnalytics => {
  let concurrentLoads = 0;

  const getAnalytics = async (forceRefresh = false) => {
    if (forceRefresh === true || blockRefresh === false) {
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.LOADING);
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      try {
        const analyticsConfigs: GetDataFrameAnalyticsResponse = await ml.dataFrameAnalytics.getDataFrameAnalytics();
        const analyticsStats: GetDataFrameAnalyticsStatsResponse = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats();

        const tableRows = analyticsConfigs.data_frame_analytics.reduce(
          (reducedtableRows, config) => {
            const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
              ? analyticsStats.data_frame_analytics.find(d => config.id === d.id)
              : undefined;

            // A newly created analytics job might not have corresponding stats yet.
            // If that's the case we just skip the job and don't add it to the analytics jobs list yet.
            if (!isDataFrameAnalyticsStats(stats)) {
              return reducedtableRows;
            }

            // Table with expandable rows requires `id` on the outer most level
            reducedtableRows.push({
              config,
              id: config.id,
              checkpointing: {},
              mode: DATA_FRAME_MODE.BATCH,
              stats,
            });
            return reducedtableRows;
          },
          [] as DataFrameAnalyticsListRow[]
        );

        setAnalytics(tableRows);
        setErrorMessage(undefined);
        setIsInitialized(true);
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
      } catch (e) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.ERROR);
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
        setAnalytics([]);
        setErrorMessage(e);
        setIsInitialized(true);
      }
      concurrentLoads--;

      if (concurrentLoads > 0) {
        concurrentLoads = 0;
        getAnalytics(true);
        return;
      }
    }
  };

  return getAnalytics;
};
