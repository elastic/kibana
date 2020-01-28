/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getRollupSearchStrategy } from './rollup_search_strategy';
import { getRollupSearchRequest } from './rollup_search_request';
import { getRollupSearchCapabilities } from './rollup_search_capabilities';
import {
  AbstractSearchRequest,
  DefaultSearchCapabilities,
  AbstractSearchStrategy,
} from '../../../../../../../src/plugins/vis_type_timeseries/server';

export const registerRollupSearchStrategy = (kbnServer, server) =>
  kbnServer.afterPluginsInit(() => {
    if (!kbnServer.newPlatform.setup.plugins.metrics) {
      return;
    }

    const { addSearchStrategy } = kbnServer.newPlatform.setup.plugins.metrics;

    const RollupSearchRequest = getRollupSearchRequest(AbstractSearchRequest);
    const RollupSearchCapabilities = getRollupSearchCapabilities(DefaultSearchCapabilities);
    const RollupSearchStrategy = getRollupSearchStrategy(
      AbstractSearchStrategy,
      RollupSearchRequest,
      RollupSearchCapabilities
    );

    addSearchStrategy(new RollupSearchStrategy(kbnServer));
  });
