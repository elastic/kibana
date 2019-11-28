/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup } from 'src/core/server';
import { Dependencies, Server } from './types';

import {
  registerLicenseRoute,
  registerStartTrialRoutes,
  registerStartBasicRoute,
  registerPermissionsRoute,
} from './routes/api/license';

export class LicenseManagementServerPlugin implements Plugin<void, void, any, any> {
  setup({ http }: CoreSetup, { __LEGACY }: Dependencies) {
    const xpackInfo = __LEGACY.xpackMain.info;
    const router = http.createRouter();

    const server: Server = {
      plugins: __LEGACY,
      router,
    };

    registerLicenseRoute(server, xpackInfo);
    registerStartTrialRoutes(server, xpackInfo);
    registerStartBasicRoute(server, xpackInfo);
    registerPermissionsRoute(server, xpackInfo);
  }
  start() {}
  stop() {}
}
