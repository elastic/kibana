/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory, KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { JobDocPayload } from '../types';

export type HandlerFunction = (
  username: string,
  exportType: string,
  jobParams: object,
  context: RequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory
) => any;

export type HandlerErrorFunction = (
  exportType: string,
  err: Error,
  res: KibanaResponseFactory
) => any;

export interface QueuedJobPayload<JobParamsType> {
  error?: boolean;
  source: {
    job: {
      payload: JobDocPayload<JobParamsType>;
    };
  };
}
