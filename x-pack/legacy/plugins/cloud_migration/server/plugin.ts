/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Core, Plugins } from '../shim';
import { API_BASE_PATH } from '../common/constants';
import { registerRoutes } from './routes/register_routes';

/**
 * Cloud migration SERVER Plugin
 */
export class CloudMigrationPlugin {
  public setup() {
    // called when plugin is setting up
  }

  public start(core: Core, plugins: Plugins) {
    // called after all plugins are set up

    // Register license checker
    plugins.license.registerLicenseChecker();

    // Register API routes
    const router = core.http.serverRouter.create(API_BASE_PATH);
    registerRoutes(router, plugins);
  }

  public stop() {
    // called when plugin is torn down, aka window.onbeforeunload
  }
}
