/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRequest } from '../../shared_imports';

import { UseRequestResponse } from '../../shared_imports';

export interface ClusterRequests {
  state: {
    get: () => UseRequestResponse;
  };
}

export const initClusterRequests = (
  client: ng.IHttpService,
  basePath: string = ''
): ClusterRequests => ({
  state: {
    get: () =>
      useRequest(client, {
        path: `${basePath}/cluster/state`,
        method: 'get',
      }),
  },
});
