/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestQuery } from 'hapi';
import { Legacy } from 'kibana';
import {
  RequestFacade,
  ReportingRequestPayload,
  ReportingRequestPre,
  ReportingRequestQuery,
} from '../../../types';

export function makeRequestFacade(request: Legacy.Request): RequestFacade {
  // This condition is for unit tests
  const getSavedObjectsClient = request.getSavedObjectsClient
    ? request.getSavedObjectsClient.bind(request)
    : request.getSavedObjectsClient;
  return {
    getSavedObjectsClient,
    headers: request.headers,
    params: request.params,
    payload: (request.payload as object) as ReportingRequestPayload,
    query: ((request.query as RequestQuery) as object) as ReportingRequestQuery,
    pre: (request.pre as Record<string, any>) as ReportingRequestPre,
    getBasePath: request.getBasePath,
    route: request.route,
    getRawRequest: () => request,
  };
}
