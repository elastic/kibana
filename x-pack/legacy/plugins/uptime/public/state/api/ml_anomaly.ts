/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_URLS, INDEX_NAMES, ML_JOB_ID, ML_MODULE_ID } from '../../../common/constants';
import { AnomalyRecordsParams } from '../actions';
import { apiService } from './utils';

export const getMLJobId = (monitorId: string) => `${monitorId}_${ML_JOB_ID}`;

export const getExistingJobs = async () => {
  const ers = await apiService.get('/api/ml/ml_capabilities');
  return await apiService.get(API_URLS.ML_MODULE_JOBS + ML_MODULE_ID);
};

export const createMLJob = async ({ monitorId }: { monitorId: string }) => {
  const url = `/api/ml/modules/setup/${ML_MODULE_ID}`;

  const dateRange = await getIndexDateRange();

  const data = {
    prefix: `${monitorId}_`,
    useDedicatedIndex: false,
    startDatafeed: true,
    start: dateRange?.[0],
    indexPatternName: INDEX_NAMES.HEARTBEAT,
    query: {
      bool: {
        filter: [
          {
            term: {
              'monitor.id': monitorId,
            },
          },
        ],
      },
    },
  };

  const response = await apiService.post(url, data);
  if (
    response?.jobs?.[0]?.id === `${monitorId}_${ML_JOB_ID}` &&
    response?.jobs?.[0]?.success === true
  ) {
    return {
      count: 1,
    };
  } else {
    return null;
  }
};

export const deleteMLJob = async ({ monitorId }: { monitorId: string }) => {
  const url = `/api/ml/jobs/delete_jobs`;

  const data = { jobIds: [`${monitorId}_${ML_JOB_ID}`] };

  return await apiService.post(url, data);
};

export const getIndexDateRange = async () => {
  const url = '/api/ml/fields_service/time_field_range';

  const data = {
    index: 'heartbeat-8*',
    timeFieldName: '@timestamp',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const result = await apiService.post(url, data);
  return [result.start.epoch, result.end.epoch];
};

export const fetchAnomalyRecords = async ({
  dateStart,
  dateEnd,
  listOfMonitorIds,
  anomalyThreshold,
}: AnomalyRecordsParams) => {
  const url = `/api/ml/results/anomalies_table_data`;

  try {
    const data = {
      jobIds: listOfMonitorIds.map((monitorId: string) => `${monitorId}_${ML_JOB_ID}`),
      criteriaFields: [],
      influencers: [],
      aggregationInterval: 'auto',
      threshold: anomalyThreshold ?? 25,
      earliestMs: dateStart,
      latestMs: dateEnd,
      dateFormatTz: 'Europe/Berlin',
      maxRecords: 500,
      maxExamples: 10,
    };
    return apiService.post(url, data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
