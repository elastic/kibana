/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreTasksStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { BoundInferenceClient } from '@kbn/inference-common';
import {
  aiAnonymizationSettings,
  parseLegacyAnonymizationRules,
  parseLegacyOnFailureMode,
} from '@kbn/ai-anonymization-common';
import type { AnonymizationFailureMode, AnonymizationRule } from '@kbn/ai-anonymization-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
  GEN_AI_SETTINGS_INFERENCE_STREAMING,
  GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING,
} from '@kbn/management-settings-ids';
import type { RegexWorkerService } from '@kbn/ai-anonymization-server';
import {
  createClient as createInferenceClient,
  createClientWithoutRequest,
  createChatModel,
} from './inference_client';
import type {
  FeatureEndpointResolver,
  InferenceBoundClientCreateOptions,
  InferenceClientCreateOptions,
  InferenceServerClient,
  InferenceServerStart,
  InferenceStartDependencies,
} from './types';
import { getConnectorList } from './util/get_connector_list';
import { loadDefaultConnector } from './util/load_default_connector';
import { getConnectorById, getConnectorByIdWithoutClientRequest } from './util/get_connector_by_id';
import { getInferenceEndpoints } from './util/get_inference_endpoints';
import { getInferenceEndpointById } from './util/get_inference_endpoint_by_id';
import type { InferenceEndpointIdCache } from './util/inference_endpoint_id_cache';
import { shouldStreamInferenceEndpoint } from './util/should_stream_inference_endpoint';
import type { TokenUsageLogger } from './token_usage';

/**
 * Resolves the `onFailure` mode from the legacy `ai:anonymizationSettings` read. A failed read
 * resolves to `block`: the rules promise built from the same read already fails the request, and
 * this promise must not reject on its own when nothing awaits it.
 */
export const resolveOnFailureMode = async ({
  anonymizationEnabled,
  legacySettingsPromise,
}: {
  anonymizationEnabled: boolean;
  legacySettingsPromise?: Promise<unknown>;
}): Promise<AnonymizationFailureMode> => {
  // The profile-based path doesn't define a failure-mode concept; keep the safe default.
  if (anonymizationEnabled || !legacySettingsPromise) {
    return 'block';
  }
  try {
    return parseLegacyOnFailureMode(await legacySettingsPromise);
  } catch {
    return 'block';
  }
};

export const resolveReplacementsEncryptionKey = async ({
  namespace,
  anonymizationEnabled,
  policyService,
}: {
  namespace: string;
  anonymizationEnabled: boolean;
  policyService?: {
    getReplacementsEncryptionKey: (targetNamespace: string) => Promise<string>;
  };
}): Promise<string | undefined> => {
  if (!anonymizationEnabled || !policyService) {
    return undefined;
  }

  return policyService.getReplacementsEncryptionKey(namespace);
};

/**
 * Builds the per-request streaming resolver. The space setting is read with the request-scoped
 * saved objects client so it reflects the request's space, while the service capability lookup
 * (`GET _inference/_services`) uses the internal ES client because the user calling chat
 * completion is not expected to hold inference management privileges.
 */
export const createInferenceStreamingResolver = ({
  core,
  logger,
  request,
}: {
  core: Pick<CoreTasksStart, 'elasticsearch' | 'savedObjects' | 'uiSettings'>;
  logger: Logger;
  request: KibanaRequest;
}) => {
  return (service?: string): Promise<boolean> =>
    shouldStreamInferenceEndpoint({
      service,
      esClient: core.elasticsearch.client.asInternalUser,
      isStreamingEnabled: async () => {
        const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
        return await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_INFERENCE_STREAMING);
      },
      logger,
    });
};

export interface InferenceStartRuntimeDeps {
  core: Pick<CoreTasksStart, 'elasticsearch' | 'savedObjects' | 'uiSettings'>;
  pluginsStart: Pick<InferenceStartDependencies, 'actions' | 'anonymization'>;
  logger: Logger;
  endpointIdCache: InferenceEndpointIdCache;
  tokenUsageLogger: TokenUsageLogger;
  regexWorker: RegexWorkerService;
  /** Set by `search_inference_endpoints`; read when a request resolves a feature's endpoint. */
  getFeatureEndpointResolver: () => FeatureEndpointResolver | undefined;
}

/** What a task runtime can do with inference: everything but installing the token usage dashboard. */
export type InferenceRuntimeStart = Omit<InferenceServerStart, 'installTokenUsageDashboard'>;

/**
 * The started inference contract over a given Core and `actions`: clients, chat models, connectors
 * and endpoints, with anonymization from the `ai:anonymizationSettings` setting. The plugin builds
 * it in Kibana and its tasks entry in a task runtime, so both talk to models the same way.
 */
export const createInferenceStart = (deps: InferenceStartRuntimeDeps): InferenceRuntimeStart => {
  const { core, pluginsStart, logger, endpointIdCache, tokenUsageLogger, regexWorker } = deps;
  const { getFeatureEndpointResolver } = deps;
  // See the note in the plugin on the dormant policy-service anonymization.
  const anonymizationEnabled = pluginsStart.anonymization?.isEnabled() ?? false;
  endpointIdCache.setEsClient(core.elasticsearch.client.asInternalUser);
  tokenUsageLogger.setEsClient(core.elasticsearch.client.asInternalUser);

  const readLegacyAnonymizationSettings = (request: KibanaRequest): Promise<unknown> => {
    const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
    const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
    return uiSettingsClient.get<unknown>(aiAnonymizationSettings);
  };

  const createAnonymizationRulesPromise = async (
    request: KibanaRequest,
    legacySettingsPromise?: Promise<unknown>
  ) => {
    const namespace = core.savedObjects.getScopedClient(request).getCurrentNamespace() ?? 'default';
    const policyService = pluginsStart.anonymization?.getPolicyService();

    const getLegacyRules = async (): Promise<AnonymizationRule[]> =>
      parseLegacyAnonymizationRules(
        await (legacySettingsPromise ?? readLegacyAnonymizationSettings(request))
      );

    if (!anonymizationEnabled || !policyService) {
      return getLegacyRules();
    }

    await policyService.ensureGlobalProfile(namespace);
    const globalProfile = await policyService.getGlobalProfile(namespace);
    if (!globalProfile) {
      return [];
    }

    const regexRules: AnonymizationRule[] = globalProfile.rules.regexRules.map((rule) => ({
      type: 'RegExp',
      enabled: rule.enabled,
      pattern: rule.pattern,
      entityClass: rule.entityClass,
    }));
    const nerRules: AnonymizationRule[] = globalProfile.rules.nerRules.map((rule) => ({
      type: 'NER',
      enabled: rule.enabled,
      modelId: rule.modelId,
      allowedEntityClasses: rule.allowedEntityClasses,
    }));

    return [...regexRules, ...nerRules];
  };

  const getAnonymizationOptions = (request: KibanaRequest) => {
    const namespace = core.savedObjects.getScopedClient(request).getCurrentNamespace() ?? 'default';
    const policyService = pluginsStart.anonymization?.getPolicyService();
    const replacementsEncryptionKeyPromise = resolveReplacementsEncryptionKey({
      namespace,
      anonymizationEnabled,
      policyService,
    });
    // One read of the setting feeds both the rules and the failure mode.
    const legacySettingsPromise = anonymizationEnabled
      ? undefined
      : readLegacyAnonymizationSettings(request);
    return {
      namespace,
      anonymizationRulesPromise: createAnonymizationRulesPromise(request, legacySettingsPromise),
      regexWorker,
      esClient: core.elasticsearch.client.asScoped(request).asCurrentUser,
      anonymization: {
        saltPromise: anonymizationEnabled ? policyService?.getSalt(namespace) : undefined,
        onFailurePromise: resolveOnFailureMode({ anonymizationEnabled, legacySettingsPromise }),
        replacements: {
          esClient: core.elasticsearch.client.asInternalUser,
          encryptionKeyPromise: replacementsEncryptionKeyPromise,
          usePersistentReplacements: anonymizationEnabled,
          requireEncryptionKey: anonymizationEnabled,
        },
      },
    };
  };

  const createDefaultConnectorOnlyCheck = (request: KibanaRequest) => {
    return async () => {
      const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
      const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
      return await uiSettingsClient.get<boolean>(
        GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
        { request }
      );
    };
  };

  const createDefaultConnectorIdGetter = (request: KibanaRequest) => {
    return async () => {
      const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
      const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
      const defaultConnector = await loadDefaultConnector({
        actions: pluginsStart.actions,
        request,
        esClient: core.elasticsearch.client.asInternalUser,
        uiSettingsClient,
        logger,
      });
      return defaultConnector?.connectorId;
    };
  };

  // uses the internal ES client, like the default connector lookup, so that aliases resolve
  // the same way regardless of whether the user can list inference endpoints
  const createConnectorIdResolver = (request: KibanaRequest) => {
    return async (connectorId: string) => {
      const connector = await getConnectorById({
        connectorId,
        actions: pluginsStart.actions,
        request,
        esClient: core.elasticsearch.client.asInternalUser,
        logger,
      });
      return connector.connectorId;
    };
  };

  const createTokenUsageTrackingEnabledCheck = (request: KibanaRequest) => {
    return async () => {
      try {
        const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
        const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
        return await uiSettingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING);
      } catch (e) {
        return false;
      }
    };
  };

  const createStreamingResolver = (request: KibanaRequest) =>
    createInferenceStreamingResolver({ core, logger, request });

  const createFeatureEndpointResolver = (request: KibanaRequest) => {
    const resolver = getFeatureEndpointResolver();
    return resolver ? (featureId: string) => resolver(featureId, request) : undefined;
  };

  return {
    getClient: <T extends InferenceClientCreateOptions>(options: T) => {
      return createInferenceClient({
        ...options,
        ...getAnonymizationOptions(options.request),
        actions: pluginsStart.actions,
        logger: logger.get('client'),
        esClient: core.elasticsearch.client.asScoped(options.request).asCurrentUser,
        endpointIdCache,
        tokenUsageLogger,
        isTokenUsageTrackingEnabled: createTokenUsageTrackingEnabledCheck(options.request),
        isDefaultConnectorOnly: createDefaultConnectorOnlyCheck(options.request),
        getDefaultConnectorId: createDefaultConnectorIdGetter(options.request),
        resolveConnectorId: createConnectorIdResolver(options.request),
        shouldStreamInferenceEndpoint: createStreamingResolver(options.request),
        resolveFeatureEndpoint: createFeatureEndpointResolver(options.request),
      }) as T extends InferenceBoundClientCreateOptions
        ? BoundInferenceClient
        : InferenceServerClient;
    },

    getChatModel: async (options) => {
      return createChatModel({
        request: options.request,
        connectorId: options.connectorId,
        chatModelOptions: options.chatModelOptions,
        callbacks: options.callbacks,
        ...getAnonymizationOptions(options.request),
        actions: pluginsStart.actions,
        regexWorker,
        esClient: core.elasticsearch.client.asScoped(options.request).asCurrentUser,
        endpointIdCache,
        logger,
        tokenUsageLogger,
        isTokenUsageTrackingEnabled: createTokenUsageTrackingEnabledCheck(options.request),
        isDefaultConnectorOnly: createDefaultConnectorOnlyCheck(options.request),
        getDefaultConnectorId: createDefaultConnectorIdGetter(options.request),
        resolveConnectorId: createConnectorIdResolver(options.request),
        shouldStreamInferenceEndpoint: createStreamingResolver(options.request),
      });
    },

    getConnectorList: async (request: KibanaRequest) => {
      const esClient = core.elasticsearch.client.asInternalUser;
      return getConnectorList({
        actions: pluginsStart.actions,
        request,
        esClient,
        logger,
      });
    },
    getDefaultConnector: async (request: KibanaRequest) => {
      const esClient = core.elasticsearch.client.asInternalUser;
      const scopedSavedObjectsClient = core.savedObjects.getScopedClient(request);
      const uiSettingsClient = core.uiSettings.asScopedToClient(scopedSavedObjectsClient);
      return loadDefaultConnector({
        actions: pluginsStart.actions,
        request,
        esClient,
        uiSettingsClient,
        logger,
      });
    },
    getConnectorById: async (id: string, request: KibanaRequest) => {
      const esClient = core.elasticsearch.client.asInternalUser;
      return getConnectorById({
        connectorId: id,
        actions: pluginsStart.actions,
        request,
        esClient,
        logger,
      });
    },
    getClientWithoutRequest: (actionsClient, esClient) => {
      return createClientWithoutRequest({
        actionsClient,
        logger,
        regexWorker,
        esClient,
        endpointIdCache,
      });
    },
    getConnectorByIdWithoutClientRequest: async (id, actionsClient, esClient) => {
      return getConnectorByIdWithoutClientRequest({
        connectorId: id,
        actionsClient,
        esClient,
        logger,
      });
    },
    getInferenceEndpoints: async (taskType?: InferenceTaskType) => {
      const esClient = core.elasticsearch.client.asInternalUser;
      return getInferenceEndpoints({ esClient, taskType });
    },
    getInferenceEndpointById: async (inferenceId: string) => {
      const esClient = core.elasticsearch.client.asInternalUser;
      return getInferenceEndpointById({ inferenceId, esClient });
    },
  };
};
