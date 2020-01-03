/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import {
  UIM_JOB_CREATE,
  UIM_JOB_DELETE,
  UIM_JOB_DELETE_MANY,
  UIM_JOB_START,
  UIM_JOB_START_MANY,
  UIM_JOB_STOP,
  UIM_JOB_STOP_MANY,
} from '../../../common';
import { getHttp } from './http_provider';
import { trackUserRequest } from './track_ui_metric';

const apiPrefix = chrome.addBasePath('/api/rollup');

export async function loadJobs() {
  const {
    data: { jobs },
  } = await getHttp().get(`${apiPrefix}/jobs`);
  return jobs;
}

export async function startJobs(jobIds) {
  const body = { jobIds };
  const request = getHttp().post(`${apiPrefix}/start`, body);
  const actionType = jobIds.length > 1 ? UIM_JOB_START_MANY : UIM_JOB_START;
  return await trackUserRequest(request, actionType);
}

export async function stopJobs(jobIds) {
  const body = { jobIds };
  const request = getHttp().post(`${apiPrefix}/stop`, body);
  const actionType = jobIds.length > 1 ? UIM_JOB_STOP_MANY : UIM_JOB_STOP;
  return await trackUserRequest(request, actionType);
}

export async function deleteJobs(jobIds) {
  const body = { jobIds };
  const request = getHttp().post(`${apiPrefix}/delete`, body);
  const actionType = jobIds.length > 1 ? UIM_JOB_DELETE_MANY : UIM_JOB_DELETE;
  return await trackUserRequest(request, actionType);
}

export async function createJob(job) {
  const body = { job };
  const request = getHttp().put(`${apiPrefix}/create`, body);
  return await trackUserRequest(request, UIM_JOB_CREATE);
}

export async function validateIndexPattern(indexPattern) {
  return await getHttp().get(`${apiPrefix}/index_pattern_validity/${indexPattern}`);
}
