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
import { ApiPrivileges } from '@kbn/core-security-server';

import type { SearchInferenceEndpointsConfig } from './config';
import { DynamicConnectorsPoller } from './lib/dynamic_connectors';
import { defineRoutes } from './routes';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import { createInferenceSettingsSavedObjectType } from './saved_objects/inference_settings';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginSetupDependencies,
  SearchInferenceEndpointsPluginStart,
  SearchInferenceEndpointsPluginStartDependencies,
} from './types';
import {
  INFERENCE_ENDPOINTS_APP_ID,
  INFERENCE_SETTINGS_SO_TYPE,
  MODEL_SETTINGS_APP_ID,
  PLUGIN_ID,
  PLUGIN_NAME,
} from '../common/constants';

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
    this.featureRegistry = new InferenceFeatureRegistry(this.logger);
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

    core.savedObjects.registerType(createInferenceSettingsSavedObjectType());

    defineRoutes({ logger: this.logger, router, featureRegistry: this.featureRegistry });

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      minimumLicense: 'enterprise',
      name: PLUGIN_NAME,
      order: 4000,
      category: DEFAULT_APP_CATEGORIES.management,
      app: [],
      catalogue: [],
      management: {
        ml: [INFERENCE_ENDPOINTS_APP_ID, MODEL_SETTINGS_APP_ID],
      },
      privileges: {
        all: {
          app: [],
          api: [ApiPrivileges.manage(PLUGIN_ID)],
          catalogue: [],
          management: {
            ml: [INFERENCE_ENDPOINTS_APP_ID, MODEL_SETTINGS_APP_ID],
          },
          savedObject: {
            all: [INFERENCE_SETTINGS_SO_TYPE],
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

    return {
      features: {
        register: this.featureRegistry.register.bind(this.featureRegistry),
      },
    };
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

    return {
      features: {
        get: this.featureRegistry.get.bind(this.featureRegistry),
        getAll: this.featureRegistry.getAll.bind(this.featureRegistry),
        register: this.featureRegistry.register.bind(this.featureRegistry),
      },
    };
  }

  public stop() {
    if (this.dynamicConnectorsPoller) {
      this.dynamicConnectorsPoller.stop();
    }
  }
}
