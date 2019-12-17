/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { fatalError } from 'ui/notify';

import { CRUD_APP_BASE_PATH } from '../../constants';
import {
  createJob as sendCreateJobRequest,
  serializeJob,
  deserializeJob,
  getRouter,
} from '../../services';

import { startJobs } from './change_job_status';

import {
  CREATE_JOB_START,
  CREATE_JOB_SUCCESS,
  CREATE_JOB_FAILURE,
  CLEAR_CREATE_JOB_ERRORS,
} from '../action_types';

export const createJob = jobConfig => async dispatch => {
  dispatch({
    type: CREATE_JOB_START,
  });

  let newJob;

  try {
    [newJob] = await Promise.all([
      sendCreateJobRequest(serializeJob(jobConfig)),
      // Wait at least half a second to avoid a weird flicker of the saving feedback.
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    if (error) {
      const { statusCode, data } = error;

      // Expect an error in the shape provided by Angular's $http service.
      if (data) {
        // Some errors have statusCode directly available but some are under a data property.
        if ((statusCode || (data && data.statusCode)) === 409) {
          return dispatch({
            type: CREATE_JOB_FAILURE,
            payload: {
              error: {
                message: i18n.translate(
                  'xpack.rollupJobs.createAction.jobIdAlreadyExistsErrorMessage',
                  {
                    defaultMessage: `A job with ID '{jobConfigId}' already exists.`,
                    values: { jobConfigId: jobConfig.id },
                  }
                ),
              },
            },
          });
        }

        return dispatch({
          type: CREATE_JOB_FAILURE,
          payload: {
            error: {
              message: i18n.translate('xpack.rollupJobs.createAction.failedDefaultErrorMessage', {
                defaultMessage: 'Request failed with a {statusCode} error. {message}',
                values: { statusCode, message: data.message },
              }),
              cause: data.cause,
            },
          },
        });
      }
    }

    // This error isn't an HTTP error, so let the fatal error screen tell the user something
    // unexpected happened.
    return fatalError(
      error,
      i18n.translate('xpack.rollupJobs.createAction.errorTitle', {
        defaultMessage: 'Error creating rollup job',
      })
    );
  }

  const deserializedJob = deserializeJob(newJob.data);

  dispatch({
    type: CREATE_JOB_SUCCESS,
    payload: { job: deserializedJob },
  });

  if (jobConfig.startJobAfterCreation) {
    dispatch(startJobs([jobConfig.id]));
  }

  // This will open the new job in the detail panel. Note that we're *not* showing a success toast
  // here, because it would partially obscure the detail panel.
  getRouter().history.push({
    pathname: `${CRUD_APP_BASE_PATH}/job_list`,
    search: `?job=${jobConfig.id}`,
  });
};

export const clearCreateJobErrors = () => dispatch => {
  dispatch({
    type: CLEAR_CREATE_JOB_ERRORS,
  });
};
