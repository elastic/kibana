/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UIM_JOB_CREATE,
  UIM_JOB_DELETE,
  UIM_JOB_DELETE_MANY,
  UIM_JOB_START,
  UIM_JOB_START_MANY,
  UIM_JOB_STOP,
  UIM_JOB_STOP_MANY,
} from '../../../common';
import { npStart } from '../../legacy_imports';
import { trackUserRequest } from './track_ui_metric';

const apiPrefix = '/api/rollup';
const { prepend } = npStart.core.http.basePath;

export async function loadJobs() {
  const { jobs } = await npStart.core.http.get(`${prepend(apiPrefix)}/jobs`);
  return jobs;
}

export async function startJobs(jobIds) {
  const body = { jobIds };
  const request = npStart.core.http.post(`${prepend(apiPrefix)}/start`, {
    body: JSON.stringify(body),
  });
  const actionType = jobIds.length > 1 ? UIM_JOB_START_MANY : UIM_JOB_START;
  return await trackUserRequest(request, actionType);
}

export async function stopJobs(jobIds) {
  const body = { jobIds };
  const request = npStart.core.http.post(`${prepend(apiPrefix)}/stop`, {
    body: JSON.stringify(body),
  });
  const actionType = jobIds.length > 1 ? UIM_JOB_STOP_MANY : UIM_JOB_STOP;
  return await trackUserRequest(request, actionType);
}

export async function deleteJobs(jobIds) {
  const body = { jobIds };
  const request = npStart.core.http.post(`${prepend(apiPrefix)}/delete`, {
    body: JSON.stringify(body),
  });
  const actionType = jobIds.length > 1 ? UIM_JOB_DELETE_MANY : UIM_JOB_DELETE;
  return await trackUserRequest(request, actionType);
}

export async function createJob(job) {
  const body = { job };
  const request = npStart.core.http.put(`${prepend(apiPrefix)}/create`, {
    body: JSON.stringify(body),
  });
  return await trackUserRequest(request, UIM_JOB_CREATE);
}

export async function validateIndexPattern(indexPattern) {
  return await npStart.core.http.get(
    `${prepend(apiPrefix)}/index_pattern_validity/${indexPattern}`
  );
}
