/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin } from 'src/core/server';

import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { PLUGIN } from '../common';
import { ServerShim, RouteDependencies } from './types';

import {
  registerGetRoute,
  registerAddRoute,
  registerUpdateRoute,
  registerDeleteRoute,
} from './routes/api';

export class RemoteClustersServerPlugin implements Plugin<void, void, any, any> {
  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    {
      __LEGACY: serverShim,
    }: {
      __LEGACY: ServerShim;
    }
  ) {
    const elasticsearch = await elasticsearchService.adminClient;
    const router = http.createRouter();
    const routeDependencies: RouteDependencies = {
      elasticsearch,
      elasticsearchService,
      router,
    };

    registerLicenseChecker(
      serverShim as any,
      PLUGIN.ID,
      PLUGIN.getI18nName(),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    // Register routes.
    registerGetRoute(routeDependencies, serverShim);
    registerAddRoute(routeDependencies, serverShim);
    registerUpdateRoute(routeDependencies, serverShim);
    registerDeleteRoute(routeDependencies, serverShim);
  }

  start() {}

  stop() {}
}
