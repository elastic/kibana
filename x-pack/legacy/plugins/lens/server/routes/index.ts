/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { initStatsRoute } from './index_stats';
import { initFieldsRoute } from './field_stats';

export function setupRoutes(setup: CoreSetup) {
  initStatsRoute(setup);
  initFieldsRoute(setup);
}
