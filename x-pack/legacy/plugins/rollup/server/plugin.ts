/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin } from 'src/core/server';
import { i18n } from '@kbn/i18n';

import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { PLUGIN } from '../common';
import { ServerShim, RouteDependencies } from './types';

import {
  registerIndicesRoute,
  // registerFieldsForWildcardRoute,
  registerSearchRoute,
  registerJobsRoute,
} from './routes/api';

export class RollupsServerPlugin implements Plugin<void, void, any, any> {
  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    { __LEGACY: serverShim }: { __LEGACY: ServerShim }
  ) {
    const elasticsearch = await elasticsearchService.adminClient;
    const router = http.createRouter();
    const routeDependencies: RouteDependencies = {
      elasticsearch,
      elasticsearchService,
      router,
    };

    // Register license checker
    registerLicenseChecker(
      serverShim as any,
      PLUGIN.ID,
      PLUGIN.getI18nName(i18n),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    registerIndicesRoute(routeDependencies, serverShim);
    // registerFieldsForWildcardRoute(routeDependencies);
    registerSearchRoute(routeDependencies, serverShim);
    registerJobsRoute(routeDependencies, serverShim);
  }
  start() {}
  stop() {}
}
