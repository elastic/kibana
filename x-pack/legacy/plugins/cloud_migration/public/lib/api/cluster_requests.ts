/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRequest, sendRequest, SendRequestResponse } from '../../shared_imports';

export interface ClusterRequests {
  state: {
    get: () => Promise<SendRequestResponse>;
  };
}

export const initClusterRequests = (
  client: ng.IHttpService,
  basePath: string = ''
): ClusterRequests => ({
  state: {
    get: () =>
      sendRequest(client, {
        path: `${basePath}/cluster/state`,
        method: 'get',
      }),
  },
});
