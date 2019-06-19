/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';
import { callWithRequestFactory } from '../call_with_request_factory';
import { licensePreRoutingFactory } from '../license_pre_routing_factory';

export const registerRollupSearchStrategy = (kbnServer, server) => kbnServer.afterPluginsInit(() => {
  const licensePreRouting = licensePreRoutingFactory(server);
  server.plugins.data.registerSearchStrategy({
    priority: 15, // Just needs to be above the default search strategy (10) so it takes precedence
    isViable: async (request, index) => {
      if (licensePreRouting() !== null) return false;
      const indexPattern = await server.plugins.data.getIndexPattern(request, index);
      return indexPattern && indexPattern.type === 'rollup';
    },
    search: async (request, index, body, { signal, onProgress = () => {} } = {}) => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        const response = await callWithRequest('rollup.search', {
          index,
          rest_total_hits_as_int: true,
          body,
        }, { signal });
        onProgress(response._shards);
        return response;
      } catch (e) {
        return server.plugins.kibana.handleEsError(e);
      }
    }
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
