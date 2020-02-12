/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchGet, fetchPost } from './utils';
import { ML_JOB_ID } from '../../../common/constants';

export const fetchMLJob = async () => {
  const url = `/api/ml/anomaly_detectors/${ML_JOB_ID}`;

  return fetchGet(url);
};

export const createMLJob = async () => {
  const data = {
    prefix: '',
    indexPatternName: 'heartbeat-8*',
    useDedicatedIndex: false,
    startDatafeed: true,
    start: 1581503000688,
    end: 1581504751315,
  };

  const url = `/api/ml/modules/setup/${ML_JOB_ID}`;

  const dateRange = await getIndexDateRange();

  return fetchPost(url, data);
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
