/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InternalRouteDeps } from '.';

export function initExampleApi(deps: InternalRouteDeps) {
  const { http, savedObjects, routePreCheckLicenseFn } = deps;

  http.route({
    method: 'GET',
    path: '/api/spaces/v1/without_wrapper',
    async handler(request: any) {
      const { getScopedSavedObjectsClient } = savedObjects;

      const savedObjectsClient = getScopedSavedObjectsClient(request, {
        excludedWrappers: ['spaces'],
      });

      // This wouldn't normally be possible if the spaces wrapper were still included
      return await savedObjectsClient.get('space', 'default');
    },
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });

  http.route({
    method: 'GET',
    path: '/api/spaces/v1/with_wrapper',
    async handler(request: any) {
      const { getScopedSavedObjectsClient } = savedObjects;

      const savedObjectsClient = getScopedSavedObjectsClient(request);

      return await savedObjectsClient.get('space', 'default');
    },
    options: {
      pre: [routePreCheckLicenseFn],
    },
  });
}
