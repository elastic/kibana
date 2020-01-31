/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { once } from 'lodash';

const callWithRequest = once(elasticsearchPlugin => {
  const cluster = elasticsearchPlugin.getCluster('data');
  return cluster.callWithRequest;
});

export const callWithRequestFactory = (elasticsearchPlugin, request) => {
  return (...args) => {
    return callWithRequest(elasticsearchPlugin)(request, ...args);
  };
};
