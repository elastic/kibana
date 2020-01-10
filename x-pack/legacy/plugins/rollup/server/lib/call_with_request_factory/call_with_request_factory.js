/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';
import { elasticsearchJsPlugin } from '../../client/elasticsearch_rollup';

const callWithRequest = once(server => {
  const config = { plugins: [elasticsearchJsPlugin] };
  const cluster = server.plugins.elasticsearch.createCluster('rollup', config);

  return cluster.callWithRequest;
});

export const callWithRequestFactory = (server, request) => {
  return (...args) => {
    return callWithRequest(server)(request, ...args);
  };
};
