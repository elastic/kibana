/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { loadJobs as sendLoadJobsRequest, deserializeJobs, showApiError } from '../../services';
import { LOAD_JOBS_START, LOAD_JOBS_SUCCESS, LOAD_JOBS_FAILURE } from '../action_types';

export const loadJobs = () => async dispatch => {
  dispatch({
    type: LOAD_JOBS_START,
  });

  let jobs;
  try {
    jobs = await sendLoadJobsRequest();
  } catch (error) {
    dispatch({
      type: LOAD_JOBS_FAILURE,
      payload: { error },
    });

    return showApiError(
      error,
      i18n.translate('xpack.rollupJobs.loadAction.errorTitle', {
        defaultMessage: 'Error loading rollup jobs',
      })
    );
  }

  dispatch({
    type: LOAD_JOBS_SUCCESS,
    payload: { jobs: deserializeJobs(jobs) },
  });
};
