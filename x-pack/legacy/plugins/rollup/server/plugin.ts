/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, PluginInitializerContext, Logger } from 'src/core/server';
import { first } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { VisTypeTimeseriesSetup } from 'src/plugins/vis_type_timeseries/server';
import { registerLicenseChecker } from '../../../server/lib/register_license_checker';
import { PLUGIN } from '../common';
import { ServerShim, RouteDependencies } from './types';

import {
  registerIndicesRoute,
  registerFieldsForWildcardRoute,
  registerSearchRoute,
  registerJobsRoute,
} from './routes/api';

import { registerRollupUsageCollector } from './collectors';

import { rollupDataEnricher } from './rollup_data_enricher';
import { registerRollupSearchStrategy } from './lib/search_strategies';

export class RollupsServerPlugin implements Plugin<void, void, any, any> {
  log: Logger;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.log = initializerContext.logger.get();
  }

  async setup(
    { http, elasticsearch: elasticsearchService }: CoreSetup,
    {
      __LEGACY: serverShim,
      usageCollection,
      metrics,
    }: {
      __LEGACY: ServerShim;
      usageCollection?: UsageCollectionSetup;
      metrics?: VisTypeTimeseriesSetup;
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
      PLUGIN.getI18nName(i18n),
      PLUGIN.MINIMUM_LICENSE_REQUIRED
    );

    registerIndicesRoute(routeDependencies, serverShim);
    registerFieldsForWildcardRoute(routeDependencies, serverShim);
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
          this.log.warn(`Registering Rollup collector failed: ${e}`);
        });
    }

    if (
      serverShim.plugins.index_management &&
      serverShim.plugins.index_management.addIndexManagementDataEnricher
    ) {
      serverShim.plugins.index_management.addIndexManagementDataEnricher(rollupDataEnricher);
    }

    if (metrics) {
      const { addSearchStrategy } = metrics;
      registerRollupSearchStrategy(routeDependencies, addSearchStrategy);
    }
  }

  start() {}

  stop() {}
}
