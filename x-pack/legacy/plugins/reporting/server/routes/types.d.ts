/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { JobDocPayload, ReportingResponseToolkit } from '../../types';

export type HandlerFunction = (
  exportType: string,
  jobParams: object,
  request: Legacy.Request,
  h: ReportingResponseToolkit
) => any;

export type HandlerErrorFunction = (exportType: string, err: Error) => any;

export interface QueuedJobPayload<JobParamsType> {
  error?: boolean;
  source: {
    job: {
      payload: JobDocPayload<JobParamsType>;
    };
  };
}
