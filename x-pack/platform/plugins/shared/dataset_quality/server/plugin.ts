/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { mapValues } from 'lodash';
import { getDatasetQualityServerRouteRepository } from './routes';
import { registerRoutes } from './routes/register_routes';
import { DatasetQualityRouteHandlerResources } from './routes/types';
import { registerBuiltInRuleTypes } from './rule_types';
import { DataTelemetryService } from './services';
import {
  DatasetQualityPluginSetup,
  DatasetQualityPluginSetupDependencies,
  DatasetQualityPluginStart,
  DatasetQualityPluginStartDependencies,
} from './types';
import { DATASET_QUALITY_ALL_SIGNALS_ID } from '../common/constants';

export class DatasetQualityServerPlugin
  implements
    Plugin<
      DatasetQualityPluginSetup,
      DatasetQualityPluginStart,
      DatasetQualityPluginSetupDependencies,
      DatasetQualityPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly dataTelemetryService: DataTelemetryService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.dataTelemetryService = new DataTelemetryService(this.logger);
  }

  setup(
    core: CoreSetup<DatasetQualityPluginStartDependencies, DatasetQualityPluginStart>,
    plugins: DatasetQualityPluginSetupDependencies
  ) {
    core.pricing.registerProductFeatures([
      {
        id: DATASET_QUALITY_ALL_SIGNALS_ID,
        description:
          'Dataset Quality All Signals - Enables all signals for the dataset quality page.',
        products: [{ name: 'observability', tier: 'complete' }],
      },
    ]);

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[key as keyof DatasetQualityPluginStartDependencies];
          }),
      };
    }) as DatasetQualityRouteHandlerResources['plugins'];

    const getEsCapabilities = async () => {
      return await core.getStartServices().then((services) => {
        const [coreStart] = services;
        return coreStart.elasticsearch.getCapabilities();
      });
    };

    registerRoutes({
      core,
      logger: this.logger,
      repository: getDatasetQualityServerRouteRepository(),
      plugins: resourcePlugins,
      getEsCapabilities,
    });

    // Setup Data Telemetry Service
    this.dataTelemetryService.setup(plugins.taskManager, plugins.usageCollection);

    if (plugins.alerting) {
      registerBuiltInRuleTypes(plugins.alerting, plugins.share?.url.locators);
    }

    return {};
  }

  start(core: CoreStart, plugins: DatasetQualityPluginStartDependencies) {
    // Start Data Telemetry Service
    this.dataTelemetryService.start(plugins.telemetry, core, plugins.taskManager).catch((error) => {
      this.logger.error(`[Data Telemetry Service]: ${error}`);
    });

    return {};
  }
}
