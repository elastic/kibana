/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  getAnalysisType,
  type DataFrameAnalysisConfigType,
  DATA_FRAME_TASK_STATE,
} from '@kbn/ml-data-frame-analytics-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlApi } from '../../../../../contexts/kibana';
import type {
  GetDataFrameAnalyticsStatsResponseError,
  GetDataFrameAnalyticsStatsResponseOk,
} from '../../../../../services/ml_api_service/data_frame_analytics';
import { REFRESH_ANALYTICS_LIST_STATE, refreshAnalyticsList$ } from '../../../../common';

import type { DataFrameAnalyticsListRow } from '../../components/analytics_list/common';
import {
  DATA_FRAME_MODE,
  isDataFrameAnalyticsFailed,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStats,
  isDataFrameAnalyticsStopped,
} from '../../components/analytics_list/common';
import type { AnalyticStatsBarStats } from '../../../../../components/stats_bar';
import { DFA_SAVED_OBJECT_TYPE } from '../../../../../../../common/types/saved_objects';
import { useCanManageSpacesAndSavedObjects } from '../../../../../hooks/use_spaces';

export const isGetDataFrameAnalyticsStatsResponseOk = (
  arg: any
): arg is GetDataFrameAnalyticsStatsResponseOk => {
  return (
    {}.hasOwnProperty.call(arg, 'count') &&
    {}.hasOwnProperty.call(arg, 'data_frame_analytics') &&
    Array.isArray(arg.data_frame_analytics)
  );
};

export type GetAnalytics = (forceRefresh?: boolean, nullableAnalyticsId?: string | null) => void;

/**
 * Gets initial object for analytics stats.
 */
export function getInitialAnalyticsStats(): AnalyticStatsBarStats {
  return {
    total: {
      label: i18n.translate('xpack.ml.overview.statsBar.totalAnalyticsLabel', {
        defaultMessage: 'Total',
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

  if (resultStats.total.value === 0) {
    resultStats.started.show = false;
    resultStats.stopped.show = false;
  }

  return resultStats;
}

export const useGetAnalytics = (
  setAnalytics: React.Dispatch<React.SetStateAction<DataFrameAnalyticsListRow[]>>,
  setAnalyticsStats: (update: AnalyticStatsBarStats | undefined) => void,
  setErrorMessage: React.Dispatch<
    React.SetStateAction<GetDataFrameAnalyticsStatsResponseError | undefined>
  >,
  setIsInitialized: React.Dispatch<React.SetStateAction<boolean>>,
  setJobsAwaitingNodeCount: React.Dispatch<React.SetStateAction<number>>,
  blockRefresh: boolean
): GetAnalytics => {
  const mlApi = useMlApi();
  const canManageSpacesAndSavedObjects = useCanManageSpacesAndSavedObjects();

  let concurrentLoads = 0;

  const getAnalytics = async (forceRefresh = false, nullableAnalyticsId?: string | null) => {
    if (forceRefresh === true || blockRefresh === false) {
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.LOADING);
      concurrentLoads++;

      if (concurrentLoads > 1) {
        return;
      }

      const analyticsId = nullableAnalyticsId ?? undefined;

      try {
        const analyticsConfigs = await mlApi.dataFrameAnalytics.getDataFrameAnalytics(analyticsId);
        const analyticsStats = await mlApi.dataFrameAnalytics.getDataFrameAnalyticsStats(
          analyticsId
        );

        let savedObjectsSpaces: Record<string, string[]> = {};
        if (canManageSpacesAndSavedObjects && mlApi.savedObjects.jobsSpaces) {
          const results = await mlApi.savedObjects.jobsSpaces();
          if (isPopulatedObject(results, [DFA_SAVED_OBJECT_TYPE])) {
            savedObjectsSpaces = results[DFA_SAVED_OBJECT_TYPE];
          }
        }
        const analyticsStatsResult = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
          ? getAnalyticsJobsStats(analyticsStats)
          : undefined;

        let jobsAwaitingNodeCount = 0;

        const tableRows = analyticsConfigs.data_frame_analytics.reduce(
          (reducedtableRows, config) => {
            const stats = isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)
              ? analyticsStats.data_frame_analytics.find((d) => config.id === d.id)
              : undefined;

            // A newly created analytics job might not have corresponding stats yet.
            // If that's the case we just skip the job and don't add it to the analytics jobs list yet.
            if (!isDataFrameAnalyticsStats(stats)) {
              return reducedtableRows;
            }

            if (stats.state === DATA_FRAME_TASK_STATE.STARTING && stats.node === undefined) {
              jobsAwaitingNodeCount++;
            }

            // Table with expandable rows requires `id` on the outer most level
            reducedtableRows.push({
              checkpointing: {},
              config,
              id: config.id,
              job_type: getAnalysisType(config.analysis) as DataFrameAnalysisConfigType,
              mode: DATA_FRAME_MODE.BATCH,
              state: stats.state,
              stats,
              spaces: savedObjectsSpaces[config.id],
            });
            return reducedtableRows;
          },
          [] as DataFrameAnalyticsListRow[]
        );

        setAnalytics(tableRows);
        setAnalyticsStats(analyticsStatsResult);
        setErrorMessage(undefined);
        setIsInitialized(true);
        setJobsAwaitingNodeCount(jobsAwaitingNodeCount);
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
