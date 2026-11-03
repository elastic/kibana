/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { createInferenceRequestError } from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { defineRoutes } from './routes';
import { createSearchInferenceEndpointsStart, getInferenceSettingsClient } from './runtime';
import { searchInferenceEndpointsBridge } from './tasks/bridge';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import { getForFeature as getForFeatureFn } from './inference_endpoints';
import { NO_DEFAULT_CONNECTOR } from './lib/resolve_models_for_feature';
import { createInferenceSettingsSavedObjectType } from './saved_objects/inference_settings';
import type {
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginSetupDependencies,
  SearchInferenceEndpointsPluginStart,
  SearchInferenceEndpointsPluginStartDependencies,
} from './types';
import {
  ELASTIC_INFERENCE_SERVICE_APP_ID,
  INFERENCE_ENDPOINTS_APP_ID,
  INFERENCE_SETTINGS_SO_TYPE,
  INFERENCE_UI_CAPABILITIES,
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
  private readonly featureRegistry: InferenceFeatureRegistry;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
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

    const featureRegistry = this.featureRegistry;

    const getForFeature = async (featureId: string, request: KibanaRequest) => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const soClient = getInferenceSettingsClient(coreStart.savedObjects, request);
      const getConnectorById = (id: string) => pluginsStart.inference.getConnectorById(id, request);
      return getForFeatureFn(featureRegistry, soClient, getConnectorById, featureId, this.logger);
    };

    const getConnectorList = async (request: KibanaRequest) => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.inference.getConnectorList(request);
    };

    const getConnectorById = async (id: string, request: KibanaRequest) => {
      const [, pluginsStart] = await core.getStartServices();
      return pluginsStart.inference.getConnectorById(id, request);
    };

    defineRoutes({
      logger: this.logger,
      router,
      featureRegistry: this.featureRegistry,
      getForFeature,
      getConnectorList,
      getConnectorById,
    });

    plugins.inference.registerFeatureEndpointResolver(async (featureId, request) => {
      const [coreStart, , { features, endpoints }] = await core.getStartServices();
      const feature = features.get(featureId);
      if (!feature) {
        throw createInferenceRequestError(`Feature "${featureId}" is not registered`, 400);
      }
      if (feature.taskType !== 'chat_completion') {
        throw createInferenceRequestError(
          `Feature "${featureId}" is not a chat completion feature (task type "${feature.taskType}")`,
          400
        );
      }

      const {
        endpoints: [topEndpoint],
        soEntryFound,
      } = await endpoints.getForFeature(featureId, request);
      if (!topEndpoint) {
        return undefined;
      }

      const isConfiguredForFeature = soEntryFound || topEndpoint.isRecommended;
      if (!isConfiguredForFeature) {
        const defaultConnectorId = await coreStart.uiSettings
          .asScopedToClient(coreStart.savedObjects.getScopedClient(request))
          .get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
        if (!defaultConnectorId || defaultConnectorId === NO_DEFAULT_CONNECTOR) {
          return undefined;
        }
        const defaultConnector = await getConnectorById(defaultConnectorId, request).catch(
          () => undefined
        );
        if (topEndpoint.connectorId !== defaultConnector?.connectorId) {
          return undefined;
        }
      }
      return {
        connectorId: topEndpoint.connectorId,
        reasoning: topEndpoint.parameters?.reasoning,
      };
    });

    plugins.features.registerKibanaFeature({
      id: PLUGIN_ID,
      minimumLicense: 'enterprise',
      name: PLUGIN_NAME,
      order: 4000,
      category: DEFAULT_APP_CATEGORIES.management,
      app: [],
      catalogue: [],
      management: {
        modelManagement: [
          ELASTIC_INFERENCE_SERVICE_APP_ID,
          INFERENCE_ENDPOINTS_APP_ID,
          MODEL_SETTINGS_APP_ID,
        ],
      },
      privileges: {
        all: {
          app: [],
          api: [ApiPrivileges.manage(PLUGIN_ID), ApiPrivileges.read(PLUGIN_ID)],
          catalogue: [],
          management: {
            modelManagement: [
              ELASTIC_INFERENCE_SERVICE_APP_ID,
              INFERENCE_ENDPOINTS_APP_ID,
              MODEL_SETTINGS_APP_ID,
            ],
          },
          savedObject: {
            all: [INFERENCE_SETTINGS_SO_TYPE],
            read: [],
          },
          ui: [INFERENCE_UI_CAPABILITIES.show, INFERENCE_UI_CAPABILITIES.manage],
        },
        read: {
          app: [],
          api: [ApiPrivileges.read(PLUGIN_ID)],
          catalogue: [],
          management: {
            modelManagement: [
              ELASTIC_INFERENCE_SERVICE_APP_ID,
              INFERENCE_ENDPOINTS_APP_ID,
              MODEL_SETTINGS_APP_ID,
            ],
          },
          savedObject: {
            all: [],
            read: [INFERENCE_SETTINGS_SO_TYPE],
          },
          ui: [INFERENCE_UI_CAPABILITIES.show],
        },
      },
    });

    const setupContract = {
      features: {
        register: this.featureRegistry.register.bind(this.featureRegistry),
      },
    };
    searchInferenceEndpointsBridge.setSetup(setupContract);
    return setupContract;
  }

  public start(core: CoreStart, plugins: SearchInferenceEndpointsPluginStartDependencies) {
    const start = createSearchInferenceEndpointsStart({
      core,
      inference: plugins.inference,
      featureRegistry: this.featureRegistry,
      logger: this.logger,
    });
    searchInferenceEndpointsBridge.setStart(start);
    return start;
  }
}
