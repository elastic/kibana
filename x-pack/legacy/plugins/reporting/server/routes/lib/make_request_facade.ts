/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestFacade } from '../../../types';

export function makeRequestFacade(request: RequestFacade): RequestFacade {
  // This condition is for unit tests
  const getSavedObjectsClient = request.getSavedObjectsClient
    ? request.getSavedObjectsClient.bind(request)
    : request.getSavedObjectsClient;
  return {
    getSavedObjectsClient,
    headers: request.headers,
    auth: request.auth, // for getUser
    params: request.params,
    payload: request.payload,
    query: request.query,
    pre: request.pre,
    getBasePath: request.getBasePath,
    route: request.route,
  };
}
