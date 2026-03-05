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
import { defineRoutes } from './routes';
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

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
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
            all: [INFERENCE_SETTINGS_SO_TYPE],
            read: [],
          },
          ui: [],
        },
        read: {
          disabled: true,
          savedObject: {
            all: [],
            read: [INFERENCE_SETTINGS_SO_TYPE],
          },
          ui: [],
        },
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
