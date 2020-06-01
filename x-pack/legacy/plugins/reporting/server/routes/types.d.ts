/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory, KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { AuthenticatedUser } from '../../../../../plugins/security/common/model/authenticated_user';
import { JobDocPayload } from '../types';

export type HandlerFunction = (
  user: AuthenticatedUser | null,
  exportType: string,
  jobParams: object,
  context: RequestHandlerContext,
  req: KibanaRequest,
  res: KibanaResponseFactory
) => any;

export type HandlerErrorFunction = (res: KibanaResponseFactory, err: Error) => any;

export interface QueuedJobPayload<JobParamsType> {
  error?: boolean;
  source: {
    job: {
      payload: JobDocPayload<JobParamsType>;
    };
  };
}
