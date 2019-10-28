/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AnalyticStatsBarStats } from '../../../components/stats_bar';
import { ml } from '../../../services/ml_api_service';
import { isGetDataFrameAnalyticsStatsResponseOk } from './services/analytics_service/get_analytics';
import {
  isDataFrameAnalyticsFailed,
  isDataFrameAnalyticsRunning,
  isDataFrameAnalyticsStopped,
} from './components/analytics_list/common';
import { getInitialAnalyticsStats } from '../../../overview/components/analytics_panel/analytics_stats_bar';

/**
 * Fetches analytics jobs stats and performs formatting for the stats bar.
 */
export async function getAnalyticsJobsStats(): Promise<AnalyticStatsBarStats | undefined> {
  try {
    const analyticsStats = await ml.dataFrameAnalytics.getDataFrameAnalyticsStats();
    if (isGetDataFrameAnalyticsStatsResponseOk(analyticsStats)) {
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
      resultStats.total.value = analyticsStats.count;
      return resultStats;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}
