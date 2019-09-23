/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { API_BASE_PATH } from '../../../common/constants';

import { initClusterRequests, ClusterRequests } from './cluster_requests';

export interface ApiRequests {
  cluster: ClusterRequests;
}

export const initApiRequests = (client: ng.IHttpService, chrome: any): ApiRequests => {
  const basePath = chrome.addBasePath(API_BASE_PATH);
  return {
    cluster: { ...initClusterRequests(client, basePath) },
  };
};
