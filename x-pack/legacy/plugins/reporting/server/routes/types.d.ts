/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { JobDocPayload } from '../../types';

export type HandlerFunction = (
  exportType: any,
  jobParams: any,
  request: Request,
  h: ResponseToolkit
) => any;

export type HandlerErrorFunction = (exportType: any, err: Error) => any;

export interface QueuedJobPayload {
  error?: boolean;
  source: {
    job: {
      payload: JobDocPayload;
    };
  };
}
