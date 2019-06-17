/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License;
* you may not use this file except in compliance with the Elastic License.
*/
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';
import { PLUGIN } from '../../../common';
import { callWithRequestFactory } from '../call_with_request_factory';

export const registerRollupSearchStrategy = (kbnServer, server) => kbnServer.afterPluginsInit(() => {
  server.plugins.data.registerSearchStrategy({
    isViable: async (server, request, index) => {
      const licenseCheckResults = server.plugins.xpack_main.info.feature(PLUGIN.ID).getLicenseCheckResults();
      if (!licenseCheckResults.isAvailable) return false;
      const indexPattern = await server.plugins.data.getIndexPattern(request, index);
      console.log(indexPattern.type);
      return indexPattern.type === 'rollup';
    },
    search: (server, request, index, body) => {
      const controller = new AbortController();
      const { signal } = controller;
      request.events.once('disconnect', () => controller.abort());
      const callWithRequest = callWithRequestFactory(server, request);
      return callWithRequest('rollup.search', {
        index,
        rest_total_hits_as_int: true,
        body,
      }, { signal });
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
