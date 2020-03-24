/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { apiService } from './utils';
import { AnomalyRecords, AnomalyRecordsParams } from '../actions';
import { API_URLS, INDEX_NAMES, ML_JOB_ID, ML_MODULE_ID } from '../../../common/constants';
import { PrivilegesResponse } from '../../../../../../plugins/ml/common/types/privileges';
import { CreateMLJobSuccess, DeleteJobResults, MonitorIdParam } from '../actions/types';
import { DataRecognizerConfigResponse } from '../../../../../../plugins/ml/common/types/modules';
import { JobExistResult } from '../../../../../../plugins/ml/common/types/data_recognizer';

export const getMLJobId = (monitorId: string) => `${monitorId}_${ML_JOB_ID}`;

export const getMLCapabilities = async (): Promise<PrivilegesResponse> => {
  return await apiService.get(API_URLS.ML_CAPABILITIES);
};

export const getExistingJobs = async (): Promise<JobExistResult> => {
  return await apiService.get(API_URLS.ML_MODULE_JOBS + ML_MODULE_ID);
};

export const createMLJob = async ({
  monitorId,
}: MonitorIdParam): Promise<CreateMLJobSuccess | null> => {
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

  const response: DataRecognizerConfigResponse = await apiService.post(url, data);
  if (response?.jobs?.[0]?.id === getMLJobId(monitorId) && response?.jobs?.[0]?.success) {
    return {
      count: 1,
      jobId: response?.jobs?.[0]?.id,
    };
  } else {
    return null;
  }
};

export const deleteMLJob = async ({ monitorId }: MonitorIdParam): Promise<DeleteJobResults> => {
  const data = { jobIds: [getMLJobId(monitorId)] };

  return await apiService.post(API_URLS.ML_DELETE_JOB, data);
};

export const fetchAnomalyRecords = async ({
  dateStart,
  dateEnd,
  listOfMonitorIds,
  anomalyThreshold,
}: AnomalyRecordsParams): Promise<AnomalyRecords> => {
  const data = {
    jobIds: listOfMonitorIds.map((monitorId: string) => getMLJobId(monitorId)),
    criteriaFields: [],
    influencers: [],
    aggregationInterval: 'auto',
    threshold: anomalyThreshold ?? 25,
    earliestMs: dateStart,
    latestMs: dateEnd,
    dateFormatTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    maxRecords: 500,
    maxExamples: 10,
  };
  return apiService.post(API_URLS.ML_ANOMALIES_RESULT, data);
};
