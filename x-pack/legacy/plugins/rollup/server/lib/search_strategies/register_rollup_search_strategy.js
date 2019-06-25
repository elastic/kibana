/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';
import { callWithRequestFactory } from '../call_with_request_factory';

export const registerRollupSearchStrategy = (kbnServer, server) => kbnServer.afterPluginsInit(() => {
  server.plugins.data.registerSearchStrategy('rollup', async (request, index, body, { signal, onProgress = () => {} } = {}) => {
    const config = await server.plugins.data.getEsSearchConfig(server, request);
    const callWithRequest = callWithRequestFactory(server, request);
    const promise = callWithRequest('rollup.search', { index, body, rest_total_hits_as_int: true, ...config }, { signal });
    return promise.then(response => {
      onProgress(response._shards);
      return response;
    }, server.plugins.kibana.handleEsError);
  });

  if (!server.plugins.metrics) {
    return;
  }

  const {
    addSearchStrategy,
    AbstractSearchRequest,
    AbstractSearchStrategy,
    DefaultSearchCapabilities,
  } = server.plugins.metrics;

  const RollupSearchRequest = getRollupSearchRequest(AbstractSearchRequest);
  const RollupSearchCapabilities = getRollupSearchCapabilities(DefaultSearchCapabilities);
  const RollupSearchStrategy = getRollupSearchStrategy(AbstractSearchStrategy, RollupSearchRequest, RollupSearchCapabilities);

  addSearchStrategy(new RollupSearchStrategy(server));
});
