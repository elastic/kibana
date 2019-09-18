/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { StatsBar, AnalyticStatsBarStats } from '../../../components/stats_bar';
import {
  DataFrameAnalyticsListRow,
  DATA_FRAME_TASK_STATE,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';

function getAnalyticsStats(analyticsList: any[]) {
  const analyticsStats = {
    total: {
      label: i18n.translate('xpack.ml.overview.statsBar.totalAnalyticsLabel', {
        defaultMessage: 'Total analytics jobs',
      }),
      value: 0,
      show: true,
    },
    started: {
      label: i18n.translate('xpack.ml.overview.statsBar.startedAnalyticsLabel', {
        defaultMessage: 'Started',
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

  if (analyticsList === undefined) {
    return analyticsStats;
  }

  let failedJobs = 0;
  let startedJobs = 0;
  let stoppedJobs = 0;

  analyticsList.forEach(job => {
    if (job.stats.state === DATA_FRAME_TASK_STATE.FAILED) {
      failedJobs++;
    } else if (job.stats.state === DATA_FRAME_TASK_STATE.STARTED) {
      startedJobs++;
    } else if (job.stats.state === DATA_FRAME_TASK_STATE.STOPPED) {
      stoppedJobs++;
    }
  });

  analyticsStats.total.value = analyticsList.length;
  analyticsStats.started.value = startedJobs;
  analyticsStats.stopped.value = stoppedJobs;

  if (failedJobs !== 0) {
    analyticsStats.failed.value = failedJobs;
    analyticsStats.failed.show = true;
  } else {
    analyticsStats.failed.show = false;
  }

  return analyticsStats;
}

interface Props {
  analyticsList: DataFrameAnalyticsListRow[];
}

export const AnalyticsStatsBar: FC<Props> = ({ analyticsList }) => {
  const analyticsStats: AnalyticStatsBarStats = getAnalyticsStats(analyticsList);

  return <StatsBar stats={analyticsStats} dataTestSub={'mlOverviewAnalyticsStatsBar'} />;
};
