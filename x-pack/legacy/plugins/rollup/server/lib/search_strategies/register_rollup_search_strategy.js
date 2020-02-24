/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';

export const registerRollupSearchStrategy = (kbnServer, server) =>
  kbnServer.afterPluginsInit(() => {
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
    const RollupSearchStrategy = getRollupSearchStrategy(
      AbstractSearchStrategy,
      RollupSearchRequest,
      RollupSearchCapabilities
    );

    addSearchStrategy(
      new RollupSearchStrategy({
        ...server,
        newPlatform: kbnServer.newPlatform,
      })
    );
  });
