/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchGet, fetchPost } from './utils';
import { INDEX_NAMES, ML_JOB_ID, ML_MODULE_ID } from '../../../common/constants';
import { AnomalyRecordsParams } from '../actions';

export const fetchMLJob = async ({ jobId }: { jobId: string }) => {
  const url = `/api/ml/anomaly_detectors/${jobId}`;
  try {
    return await fetchGet(url);
  } catch (error) {
    // if (error.response.status === 404) {
    //   return null;
    // }
    throw error;
  }
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

  const response = await fetchPost(url, data);
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
    return fetchPost(url, data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
