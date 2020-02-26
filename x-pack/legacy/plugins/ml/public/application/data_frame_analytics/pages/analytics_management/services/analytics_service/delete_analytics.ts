/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getToastNotifications } from '../../../../../util/dependency_cache';
import { ml } from '../../../../../services/ml_api_service';

import { refreshAnalyticsList$, REFRESH_ANALYTICS_LIST_STATE } from '../../../../common';

import {
  isDataFrameAnalyticsFailed,
  DataFrameAnalyticsListRow,
} from '../../components/analytics_list/common';

export const deleteAnalytics = async (d: DataFrameAnalyticsListRow) => {
  const toastNotifications = getToastNotifications();
  try {
    if (isDataFrameAnalyticsFailed(d.stats.state)) {
      await ml.dataFrameAnalytics.stopDataFrameAnalytics(d.config.id, true, true);
    }
    await ml.dataFrameAnalytics.deleteDataFrameAnalytics(d.config.id);
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsSuccessMessage', {
        defaultMessage: 'Request to delete data frame analytics {analyticsId} acknowledged.',
        values: { analyticsId: d.config.id },
      })
    );
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.analyticsList.deleteAnalyticsErrorMessage', {
        defaultMessage:
          'An error occurred deleting the data frame analytics {analyticsId}: {error}',
        values: { analyticsId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
  refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
};
