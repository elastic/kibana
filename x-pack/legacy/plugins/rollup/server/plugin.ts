/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { PLUGIN } from '../common';
import { ServerShim, RouteDependencies } from './types';

import {
  registerIndicesRoute,
  // registerFieldsForWildcardRoute,
  registerSearchRoute,
  registerJobsRoute,
} from './routes/api';

import { registerRollupUsageCollector } from './collectors';

export class RollupsServerPlugin implements Plugin<void, void, any, any> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    {
      __LEGACY: serverShim,
      usageCollection,
    }: { __LEGACY: ServerShim; usageCollection?: UsageCollectionSetup }
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

    if (usageCollection) {
      this.initializerContext.config.legacy.globalConfig$
        .pipe(first())
        .toPromise()
        .then(config => {
          registerRollupUsageCollector(usageCollection, config.kibana.index);
        })
        .catch(e => {
          this.initializerContext.logger
            .get('rollup')
            .warn(`Registering Rollup collector failed: ${e}`);
        });
    }
  }
  start() {}
  stop() {}
}
