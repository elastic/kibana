/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../services/ml_api_service';

import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';

import {
  DATA_FRAME_TASK_STATE,
  DataFrameAnalyticsListRow,
} from '../../components/analytics_list/common';

export const startAnalytics = async (d: DataFrameAnalyticsListRow) => {
  try {
    await ml.dataFrameAnalytics.startDataFrameAnalytics(
      d.config.id,
      d.stats.state === DATA_FRAME_TASK_STATE.FAILED
    );
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.analyticsList.startAnalyticsSuccessMessage', {
        defaultMessage: 'Data frame analytics {analyticsId} started successfully.',
        values: { analyticsId: d.config.id },
      })
    );
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.startAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred starting the data frame analytics {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};
