/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { initStatsRoute } from './index_stats';
import { indexPatternsRoute } from './index_pattern';
import { emptyFieldsRoute } from './empty_fields';
import { LensServerOptions } from '../server_options';

export function setupRoutes(opts: LensServerOptions, setup: CoreSetup) {
  const router = setup.http.createRouter();

  initStatsRoute(router);
  indexPatternsRoute(opts, router);
  emptyFieldsRoute(opts, router);
}
