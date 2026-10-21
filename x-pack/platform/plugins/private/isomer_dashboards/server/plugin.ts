/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/server';

import { registerRoutes } from './routes';
import type { IsomerDashboardsStartDeps } from './types';

export class IsomerDashboardsPlugin
  implements Plugin<void, void, object, IsomerDashboardsStartDeps>
{
  setup(core: CoreSetup<IsomerDashboardsStartDeps>) {
    registerRoutes(core.http.createRouter(), core);
  }

  start() {}

  stop() {}
}
