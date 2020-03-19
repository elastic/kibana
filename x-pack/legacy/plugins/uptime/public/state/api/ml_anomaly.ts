/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { API_URLS, INDEX_NAMES, ML_JOB_ID, ML_MODULE_ID } from '../../../common/constants';
import { AnomalyRecordsParams } from '../actions';
import { apiService } from './utils';

export const getMLJobId = (monitorId: string) => `${monitorId}_${ML_JOB_ID}`;

export const getMLCapabilities = async () => {
  return await apiService.get(API_URLS.ML_CAPABILITIES);
};

export const getExistingJobs = async () => {
  return await apiService.get(API_URLS.ML_MODULE_JOBS + ML_MODULE_ID);
};

export const createMLJob = async ({ monitorId }: { monitorId: string }) => {
  const url = API_URLS.ML_SETUP_MODULE + ML_MODULE_ID;

  const data = {
    prefix: `${monitorId}_`,
    useDedicatedIndex: false,
    startDatafeed: true,
    start: moment()
      .subtract(24, 'h')
      .valueOf(),
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
  if (response?.jobs?.[0]?.id === getMLJobId(monitorId) && response?.jobs?.[0]?.success === true) {
    return {
      count: 1,
    };
  } else {
    return null;
  }
};

export const deleteMLJob = async ({ monitorId }: { monitorId: string }) => {
  const data = { jobIds: [getMLJobId(monitorId)] };

  return await apiService.post(API_URLS.ML_DELETE_JOB, data);
};

export const fetchAnomalyRecords = async ({
  dateStart,
  dateEnd,
  listOfMonitorIds,
  anomalyThreshold,
}: AnomalyRecordsParams) => {
  try {
    const data = {
      jobIds: listOfMonitorIds.map((monitorId: string) => getMLJobId(monitorId)),
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
    return apiService.post(API_URLS.ML_ANOMALIES_RESULT, data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};
