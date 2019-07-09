/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../../services/ml_api_service';

import { refreshTransformList$, REFRESH_TRANSFORM_LIST_STATE } from '../../../../../common';

import { DATA_FRAME_TASK_STATE, DataFrameJobListRow } from '../common';

export const stopJob = async (d: DataFrameJobListRow) => {
  try {
    await ml.dataFrame.stopDataFrameTransformsJob(
      d.config.id,
      d.state.task_state === DATA_FRAME_TASK_STATE.FAILED,
      true
    );
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.jobsList.stopJobSuccessMessage', {
        defaultMessage: 'Data frame transform {jobId} stopped successfully.',
        values: { jobId: d.config.id },
      })
    );
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.jobsList.stopJobErrorMessage', {
        defaultMessage: 'An error occurred stopping the data frame transform {jobId}: {error}',
        values: { jobId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
  refreshTransformList$.next(REFRESH_TRANSFORM_LIST_STATE.REFRESH);
};
