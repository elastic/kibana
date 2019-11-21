/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kfetch } from 'ui/kfetch';

// @ts-ignore
import rison from 'rison-node';
import chrome from 'ui/chrome';
import { QueryString } from 'ui/utils/query_string';
import { jobCompletionNotifications } from './job_completion_notifications';

const API_BASE_URL = '/api/reporting/generate';

interface JobParams {
  [paramName: string]: any;
}

class ReportingClient {
  public getReportingJobPath = (exportType: string, jobParams: JobParams) => {
    return `${chrome.addBasePath(API_BASE_URL)}/${exportType}?${QueryString.param(
      'jobParams',
      rison.encode(jobParams)
    )}`;
  };

  public createReportingJob = async (exportType: string, jobParams: any) => {
    const jobParamsRison = rison.encode(jobParams);
    const resp = await kfetch({
      method: 'POST',
      pathname: `${API_BASE_URL}/${exportType}`,
      body: JSON.stringify({
        jobParams: jobParamsRison,
      }),
    });
    jobCompletionNotifications.add(resp.job.id);
    return resp;
  };
}

export const reportingClient = new ReportingClient();
