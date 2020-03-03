/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchDelete, fetchGet, fetchPost } from './utils';
import { INDEX_NAMES, ML_JOB_ID } from '../../../common/constants';

export const fetchMLJob = async () => {
  const url = `/api/ml/anomaly_detectors/${ML_JOB_ID}`;
  try {
    return await fetchGet(url);
  } catch (error) {
    // if (error.response.status === 404) {
    //   return null;
    // }
    throw error;
  }
};

export const createMLJob = async () => {
  const url = `/api/ml/modules/setup/${ML_JOB_ID}`;

  const dateRange = await getIndexDateRange();

  const data = {
    prefix: '',
    useDedicatedIndex: false,
    startDatafeed: true,
    start: dateRange?.[0],
    end: dateRange?.[1],
    indexPatternName: INDEX_NAMES.HEARTBEAT,
  };

  const response = await fetchPost(url, data);
  if (response?.jobs?.[0]?.id === ML_JOB_ID && response?.jobs?.[0]?.success === true) {
    return {
      count: 1,
    };
  } else {
    return null;
  }
};

export const deleteMLJob = async () => {
  const url = `/api/ml/jobs/delete_jobs`;

  const data = { jobIds: [ML_JOB_ID] };

  const response = await fetchPost(url, data);
  if (response?.[ML_JOB_ID]?.deleted) {
    return null;
  }
};

export const getIndexDateRange = async () => {
  const url = '/api/ml/fields_service/time_field_range';

  const data = {
    index: 'heartbeat-8*',
    timeFieldName: '@timestamp',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const result = await fetchPost(url, data);
  return [result.start.epoch, result.end.epoch];
};

export const fetchAnomalyRecords = async params => {
  const { dateStart, dateEnd } = params;
  const url = `/api/ml/anomaly_detectors/${ML_JOB_ID}/results/records`;
  try {
    return fetchPost(url, {
      start: dateStart,
      end: dateEnd,
      record_score: 10,
    });
  } catch (error) {
    if (error.response.status === 404) {
      return null;
    }
    throw error;
  }
};
