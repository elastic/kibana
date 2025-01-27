/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadJobs as sendLoadJobsRequest, deserializeJobs } from '../../services';
import { LOAD_JOBS_START, LOAD_JOBS_SUCCESS, LOAD_JOBS_FAILURE } from '../action_types';

export const loadJobs = () => async (dispatch) => {
  dispatch({
    type: LOAD_JOBS_START,
  });

  let jobs;
  try {
    jobs = await sendLoadJobsRequest();
  } catch (error) {
    return dispatch({
      type: LOAD_JOBS_FAILURE,
      payload: { error },
    });
  }

  dispatch({
    type: LOAD_JOBS_SUCCESS,
    payload: { jobs: deserializeJobs(jobs) },
  });
};
