/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  GetDataFrameAnalyticsStatsResponse,
  GetDataFrameAnalyticsStatsResponseError,
  GetDataFrameAnalyticsStatsResponseOk,
  ml,
} from '../../../../../services/ml_api_service';
import {
  DataFrameAnalyticsConfig,
  REFRESH_ANALYTICS_LIST_STATE,
  refreshAnalyticsList$,
} from '../../../../common';

import {
  DATA_FRAME_MODE,
  DataFrameAnalyticsListRow,
  isDataFrameAnalyticsFailed,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStats,
  isDataFrameAnalyticsStopped,
} from '../../components/analytics_list/common';
import { AnalyticStatsBarStats } from '../../../../../components/stats_bar';

interface GetDataFrameAnalyticsResponse {
  count: number;
  data_frame_analytics: DataFrameAnalyticsConfig[];
}

export const isGetDataFrameAnalyticsStatsResponseOk = (
  arg: any
): arg is GetDataFrameAnalyticsStatsResponseOk => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'data_frame_analytics') &&
    Array.isArray(arg.data_frame_analytics)
  );
};

export type GetAnalytics = (forceRefresh?: boolean) => void;

/**
 * Gets initial object for analytics stats.
 */
export function getInitialAnalyticsStats(): AnalyticStatsBarStats {
  return {
    total: {
      label: i18n.translate('xpack.ml.overview.statsBar.totalAnalyticsLabel', {
        defaultMessage: 'Total analytics jobs',
      }),
      value: 0,
      show: true,
    },
    started: {
      label: i18n.translate('xpack.ml.overview.statsBar.runningAnalyticsLabel', {
        defaultMessage: 'Running',
      }),
      value: 0,
      show: true,
    },
    stopped: {
      label: i18n.translate('xpack.ml.overview.statsBar.stoppedAnalyticsLabel', {
        defaultMessage: 'Stopped',
      }),
      value: 0,
      show: true,
    },
    failed: {
      label: i18n.translate('xpack.ml.overview.statsBar.failedAnalyticsLabel', {
        defaultMessage: 'Failed',
      }),
      value: 0,
      show: false,
    },
  };
}

/**
 * Gets analytics jobs stats formatted for the stats bar.
 */
export function getAnalyticsJobsStats(
  analyticsStats: GetDataFrameAnalyticsStatsResponseOk
): AnalyticStatsBarStats {
  const resultStats: AnalyticStatsBarStats = analyticsStats.data_frame_analytics.reduce(
    (acc, { state }) => {
      if (isDataFrameAnalyticsFailed(state)) {
        acc.failed.value = ++acc.failed.value;
      } else if (isDataFrameAnalyticsRunning(state)) {
        acc.started.value = ++acc.started.value;
      } else if (isDataFrameAnalyticsStopped(state)) {
        acc.stopped.value = ++acc.stopped.value;
      }
      return acc;
    },
    getInitialAnalyticsStats()
  );
  resultStats.failed.show = resultStats.failed.value > 0;
  resultStats.total.value = analyticsStats.count;
  return resultStats;
}

export const getAnalyticsFactory = (
  setAnalytics: React.Dispatch<React.SetStateAction<DataFrameAnalyticsListRow[]>>,
  setAnalyticsStats: React.Dispatch<React.SetStateAction<AnalyticStatsBarStats | undefined>>,
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

        const analyticsStatsResult = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
          ? getAnalyticsJobsStats(analyticsStats)
          : undefined;

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
        setAnalyticsStats(analyticsStatsResult);
        setErrorMessage(undefined);
        setIsInitialized(true);
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
      } catch (e) {
        // An error is followed immediately by setting the state to idle.
        // This way we're able to treat ERROR as a one-time-event like REFRESH.
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.ERROR);
        refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.IDLE);
        setAnalytics([]);
        setAnalyticsStats(undefined);
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
