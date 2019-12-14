/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getCallClusterPre = {
  assign: 'callCluster',
  method(request) {
    const cluster = request.server.plugins.elasticsearch.getCluster('data');
    return (...args) => cluster.callWithRequest(request, ...args);
  },
};
