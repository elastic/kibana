/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOAD_JOBS_START,
  LOAD_JOBS_SUCCESS,
  LOAD_JOBS_FAILURE,
  REFRESH_JOBS_SUCCESS,
  CREATE_JOB_SUCCESS,
} from '../action_types';

const initialState = {
  isLoading: false,
  byId: {},
  allIds: [],
};

function mapJobsToIds(jobs) {
  const jobsById = {};
  jobs.forEach(job => {
    jobsById[job.id] = job;
  });
  return jobsById;
}

function getJobsIds(jobs) {
  return jobs.map(job => job.id);
}

export function jobs(state = initialState, action) {
  const { type, payload } = action;

  switch (type) {
    case LOAD_JOBS_START:
      return {
        ...state,
        isLoading: true,
      };

    case LOAD_JOBS_SUCCESS:
      return {
        byId: mapJobsToIds(payload.jobs),
        allIds: getJobsIds(payload.jobs),
        isLoading: false,
      };

    case REFRESH_JOBS_SUCCESS:
      return {
        byId: mapJobsToIds(payload.jobs),
        allIds: getJobsIds(payload.jobs),
      };

    case LOAD_JOBS_FAILURE:
      return {
        ...state,
        isLoading: false,
        jobLoadError: payload.error,
      };

    case CREATE_JOB_SUCCESS:
      const { job } = payload;

      return {
        byId: {
          ...state.byId,
          [job.id]: job,
        },
        allIds: state.allIds.concat(job.id),
      };

    default:
      return state;
  }
}
