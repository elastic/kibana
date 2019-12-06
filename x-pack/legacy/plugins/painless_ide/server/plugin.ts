/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, PluginsSetup } from './legacy';
import { API_BASE_PATH } from '../common/constants';
import { registerRoutes } from './routes/register_routes';
export class PainlessIdePlugin {
  public setup(coreSetup: CoreSetup, pluginsSetup: PluginsSetup) {
    const {
      __LEGACY: {
        http: { createRouter },
      },
    } = coreSetup;

    const {
      __LEGACY: {
        license: { registerLicenseChecker },
      },
    } = pluginsSetup;

    // Register license checker
    registerLicenseChecker();

    // Register API routes
    const router = createRouter(API_BASE_PATH);
    registerRoutes(router);
  }
}
