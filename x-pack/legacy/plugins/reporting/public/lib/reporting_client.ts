/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';
// @ts-ignore
import rison from 'rison-node';
import { add } from './job_completion_notifications';
import { url } from '../../../../../../src/plugins/kibana_utils/public';

const { core } = npStart;
const API_BASE_URL = '/api/reporting/generate';

interface JobParams {
  [paramName: string]: any;
}

export const getReportingJobPath = (exportType: string, jobParams: JobParams) => {
  const params = url.stringifyUrlQuery({ jobParams: rison.encode(jobParams) });

  return `${core.http.basePath.prepend(API_BASE_URL)}/${exportType}?${params}`;
};

export const createReportingJob = async (exportType: string, jobParams: any) => {
  const jobParamsRison = rison.encode(jobParams);
  const resp = await core.http.post(`${API_BASE_URL}/${exportType}`, {
    method: 'POST',
    body: JSON.stringify({
      jobParams: jobParamsRison,
    }),
  });

  add(resp.job.id);

  return resp;
};
