/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../../services/ml_api_service';

import { DataFrameJobListRow } from '../common';

import { GetJobs } from './get_jobs';

export const startJobFactory = (getJobs: GetJobs) => async (d: DataFrameJobListRow) => {
  try {
    await ml.dataFrame.startDataFrameTransformsJob(d.config.id);
    toastNotifications.addSuccess(
      i18n.translate('xpack.ml.dataframe.jobsList.startJobSuccessMessage', {
        defaultMessage: 'Data frame job {jobId} started successfully.',
        values: { jobId: d.config.id },
      })
    );
    getJobs(true);
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.jobsList.startJobErrorMessage', {
        defaultMessage: 'An error occurred starting the data frame job {jobId}: {error}',
        values: { jobId: d.config.id, error: JSON.stringify(e) },
      })
    );
  }
};
