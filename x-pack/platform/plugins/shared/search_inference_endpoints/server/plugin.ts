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
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { createInferenceRequestError } from '@kbn/inference-common';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

import { defineRoutes } from './routes';
import { InferenceFeatureRegistry } from './inference_feature_registry';
import { getForFeature as getForFeatureFn } from './inference_endpoints';
import { NO_DEFAULT_CONNECTOR, resolveModelsForFeature } from './lib/resolve_models_for_feature';
import { createInferenceSettingsSavedObjectType } from './saved_objects/inference_settings';
import type {
  GetForFeatureOptions,
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

// Model settings are admin policy that must apply to every user, including those
// without read access to the settings saved object, so the read bypasses user authz
// while staying scoped to the request's active space.
const getInferenceSettingsClient = (
  savedObjects: SavedObjectsServiceStart,
  request: KibanaRequest
): SavedObjectsClientContract => {
  const internalClient = savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [INFERENCE_SETTINGS_SO_TYPE],
  });
  const namespace = savedObjects.getScopedClient(request).getCurrentNamespace();
  return namespace ? internalClient.asScopedToNamespace(namespace) : internalClient;
};

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

    return {
      features: {
        register: this.featureRegistry.register.bind(this.featureRegistry),
      },
    };
  }

  public start(core: CoreStart, plugins: SearchInferenceEndpointsPluginStartDependencies) {
    const featureRegistry = this.featureRegistry;

    return {
      features: {
        get: featureRegistry.get.bind(featureRegistry),
        getAll: featureRegistry.getAll.bind(featureRegistry),
        register: featureRegistry.register.bind(featureRegistry),
        updateRecommendedEndpoints:
          featureRegistry.updateRecommendedEndpoints.bind(featureRegistry),
      },
      endpoints: {
        getForFeature: async (
          featureId: string,
          request: KibanaRequest,
          opts?: GetForFeatureOptions
        ) => {
          const soClient = getInferenceSettingsClient(core.savedObjects, request);
          const getConnectorById = (id: string) => plugins.inference.getConnectorById(id, request);
          const uiSettingsClient = core.uiSettings.asScopedToClient(
            core.savedObjects.getScopedClient(request)
          );

          // `onlyReturnConfigured` has to reach endpoint-id resolution. Otherwise a
          // feature with no saved row and no recommended endpoints answers with the
          // platform default, and a caller cannot tell that nothing was configured.
          const resolveFeatureEndpoints = (fId: string) =>
            getForFeatureFn(featureRegistry, soClient, getConnectorById, fId, this.logger, opts);
          const getConnectorList = () => plugins.inference.getConnectorList(request);
          const feature = featureRegistry.get(featureId);

          const result = await resolveModelsForFeature({
            getForFeature: resolveFeatureEndpoints,
            getConnectorList,
            getConnectorById,
            uiSettingsClient,
            featureId,
            ignoreGlobalDefault: feature?.ignoreGlobalDefault ?? false,
            opts,
            logger: this.logger,
          });

          return {
            endpoints: result.connectors,
            warnings: result.warnings,
            soEntryFound: result.soEntryFound,
          };
        },
      },
    };
  }
}
