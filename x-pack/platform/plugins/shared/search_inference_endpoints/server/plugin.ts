/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';

import type { SearchInferenceEndpointsConfig } from './config';
import { DynamicConnectorsPoller } from './lib/dynamic_connectors';
import { deepFreeze } from '@kbn/std';
import { defineRoutes } from './routes';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginSetupDependencies,
  SearchInferenceEndpointsPluginStart,
  SearchInferenceEndpointsPluginStartDependencies,
} from './types';
import { INFERENCE_ENDPOINTS_APP_ID, PLUGIN_ID, PLUGIN_NAME } from '../common/constants';

export class SearchInferenceEndpointsPlugin
  implements
    Plugin<
      SearchInferenceEndpointsPluginSetup,
      SearchInferenceEndpointsPluginStart,
      SearchInferenceEndpointsPluginSetupDependencies,
      SearchInferenceEndpointsPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly config: SearchInferenceEndpointsConfig;
  private dynamicConnectorsPoller?: DynamicConnectorsPoller;
  private readonly featureRegistry: InferenceFeatureRegistry;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfig>();
    this.featureRegistry = new InferenceFeatureRegistry();
  }

  public setup(
    core: CoreSetup<
      SearchInferenceEndpointsPluginStartDependencies,
      SearchInferenceEndpointsPluginStart
    >,
    plugins: SearchInferenceEndpointsPluginSetupDependencies
  ) {
    this.logger.debug('searchInferenceEndpoints: Setup');
    const router = core.http.createRouter();

    defineRoutes({ logger: this.logger, router });

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      minimumLicense: 'enterprise',
      name: PLUGIN_NAME,
      order: 2,
      category: DEFAULT_APP_CATEGORIES.enterpriseSearch,
      app: [],
      catalogue: [],
      management: {
        ml: [INFERENCE_ENDPOINTS_APP_ID],
      },
      privileges: {
        all: {
          app: [],
          api: [],
          catalogue: [],
          management: {
            ml: [INFERENCE_ENDPOINTS_APP_ID],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    return deepFreeze({
      features: {
        register: this.featureRegistry.register.bind(this.featureRegistry),
      },
    });
  }

  public start(core: CoreStart, plugins: SearchInferenceEndpointsPluginStartDependencies) {
    if (this.config.dynamicConnectors.enabled) {
      this.logger.debug(
        `dynamic connectors enabled: ${this.config.dynamicConnectors.enabled} - polling ${this.config.dynamicConnectors.pollingIntervalMins} mins`
      );
      this.dynamicConnectorsPoller = new DynamicConnectorsPoller(
        this.logger,
        plugins.actions,
        core.elasticsearch.client.asInternalUser,
        this.config.dynamicConnectors.pollingIntervalMins
      );
      this.dynamicConnectorsPoller.start();
    }

    this.featureRegistry.lockRegistration();
    this.featureRegistry.validateFeatures();
    return {};
  }

  public stop() {
    if (this.dynamicConnectorsPoller) {
      this.dynamicConnectorsPoller.stop();
    }
  }
}
