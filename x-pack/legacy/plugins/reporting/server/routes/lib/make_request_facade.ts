/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest, IBasePath, RequestHandlerContext } from 'src/core/server';
import {
  RequestFacade,
  ReportingRequestPayload,
  ReportingRequestQuery,
} from '../../../server/types';

export function makeRequestFacade(
  context: RequestHandlerContext,
  request: KibanaRequest,
  basePath: IBasePath['get']
): RequestFacade {
  return {
    getSavedObjectsClient: () => context.core.savedObjects.client,
    headers: request.headers as Record<string, string>,
    params: request.params as Record<string, string>,
    body: (request.body as object) as ReportingRequestPayload,
    query: (request.query as object) as ReportingRequestQuery,
    getBasePath: () => basePath(request),
    route: request.route,
    getRawRequest: () => request,
  };
}
