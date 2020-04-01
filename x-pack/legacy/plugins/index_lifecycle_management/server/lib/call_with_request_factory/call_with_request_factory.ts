/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { Legacy } from 'kibana';

const callWithRequest = once((server: Legacy.Server): any => {
  const cluster = server.plugins.elasticsearch.getCluster('data');
  return cluster.callWithRequest;
});

export const callWithRequestFactory = (server: Legacy.Server, request: any) => {
  return (...args: any[]) => {
    return callWithRequest(server)(request, ...args);
  };
};
