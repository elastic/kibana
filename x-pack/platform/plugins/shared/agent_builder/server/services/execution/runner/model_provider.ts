/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { EffortLevels } from '@kbn/agent-builder-common/model_provider';
import type { RuntimeStart } from '@kbn/agent-builder-server';
import type {
  ModelProvider,
  ModelSource,
  ScopedModel,
  ModelProviderStats,
  ModelCallInfo,
} from '@kbn/agent-builder-server/runner';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { getConnectorProvider, getConnectorModel } from '@kbn/inference-common';
import type {
  BoundInferenceClient,
  ChatCompletionReasoningEffort,
  ConnectorTelemetryMetadata,
  InferenceConnector,
} from '@kbn/inference-common';
import type { InferenceCompleteCallbackHandler } from '@kbn/inference-common/src/chat_complete';
import { AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import type { TrackingService } from '../../../telemetry';
import { MODEL_TELEMETRY_METADATA } from '../../../telemetry';
import { getCurrentTraceId } from '../../../tracing';
import { getCurrentSpaceId } from '../../../utils/spaces';
import { getUserFromRequest } from '../../utils';
import { resolveAgentBuilderDefaultEndpoint } from '../utils/resolve_default_endpoint';

export interface CreateModelProviderOpts {
  inference: InferenceServerStart;
  request: KibanaRequest;
  /**
   * Where the default model comes from. When omitted, the `agent_builder` inference feature's
   * first endpoint is used.
   */
  defaultModel?: ModelSource;
  trackingService?: TrackingService;
  logger: Logger;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  maxContentLength?: number;
  reasoningLevel?: ChatCompletionReasoningEffort;
  spaces?: SpacesPluginStart;
  security?: SecurityServiceStart;
  elasticsearch?: ElasticsearchServiceStart;
}

export type CreateModelProviderFactoryFn = (
  opts: Omit<
    CreateModelProviderOpts,
    'request' | 'defaultModel' | 'telemetryMetadata' | 'maxContentLength' | 'reasoningLevel'
  >
) => ModelProviderFactoryFn;

export type ModelProviderFactoryFn = (
  opts: Pick<
    CreateModelProviderOpts,
    'request' | 'defaultModel' | 'telemetryMetadata' | 'maxContentLength' | 'reasoningLevel'
  >
) => ModelProvider;

/**
 * Maps the connector-only `defaultConnectorId` contract still exposed to tool runs and the plugin
 * API onto a model source; `undefined` keeps the provider on its own default.
 */
export const connectorModelSource = (connectorId?: string): ModelSource | undefined =>
  connectorId ? { connectorId } : undefined;

/**
 * What a scoped model is built from: a model source, plus whether the provider-level reasoning
 * applies to it. Reasoning is only ever applied to connector-sourced models: a feature owns its
 * own reasoning settings, which the inference plugin applies.
 */
interface ScopedModelSpec {
  source: ModelSource;
  applyReasoning: boolean;
}

const memoizeAsync = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  let cached: Promise<T> | undefined;
  return () => (cached ??= fn());
};

const memoizeAsyncByKey = <A, T>(
  keyOf: (arg: A) => string,
  fn: (arg: A) => Promise<T>
): ((arg: A) => Promise<T>) => {
  const cache = new Map<string, Promise<T>>();
  return (arg: A) => {
    const key = keyOf(arg);
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
    const pending = fn(arg).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, pending);
    return pending;
  };
};

/**
 * Utility function to creates a {@link ModelProviderFactoryFn}
 */
export const createModelProviderFactory: CreateModelProviderFactoryFn = (factoryOpts) => (opts) => {
  return createModelProvider({
    ...factoryOpts,
    ...opts,
  });
};

/**
 * Adapts a {@link ModelProviderFactoryFn} to the plugin's public `runtime.createModelProvider`
 * contract, which stays connector-only: a feature-sourced default is an execution concern.
 */
export const createRuntimeModelProviderFactory =
  (modelProviderFactory: ModelProviderFactoryFn): RuntimeStart['createModelProvider'] =>
  ({ request, defaultConnectorId, telemetryMetadata }) =>
    modelProviderFactory({
      request,
      defaultModel: connectorModelSource(defaultConnectorId),
      ...(telemetryMetadata ? { telemetryMetadata } : {}),
    });

/**
 * Utility function to create a {@link ModelProvider}
 */
export const createModelProvider = ({
  inference,
  request,
  defaultModel,
  trackingService,
  searchInferenceEndpoints,
  logger,
  telemetryMetadata,
  maxContentLength,
  reasoningLevel,
  spaces,
  security,
  elasticsearch,
}: CreateModelProviderOpts): ModelProvider => {
  const getResolvedTelemetryMetadata = memoizeAsync(
    async (): Promise<ConnectorTelemetryMetadata> => {
      const traceId = getCurrentTraceId();
      const spaceId = spaces ? getCurrentSpaceId({ request, spaces }) : undefined;
      // Only forward an actual profile UID: toStableUserId() falls back to a
      // `realm:[type,name,username]` synthetic id (used internally for ownership checks) when
      // the user has no activated profile, and that string embeds the raw username.
      const resolvedUserId =
        security && elasticsearch
          ? (
              await getUserFromRequest({
                request,
                security,
                esClient: elasticsearch.client.asScoped(request).asCurrentUser,
              })
            ).id
          : undefined;
      const userId =
        resolvedUserId && !resolvedUserId.startsWith('realm:') ? resolvedUserId : undefined;

      return {
        ...MODEL_TELEMETRY_METADATA,
        ...(traceId ? { traceId } : {}),
        ...(spaceId ? { spaceId } : {}),
        ...(userId ? { userId } : {}),
        ...telemetryMetadata,
      };
    }
  );
  const getDefaultModelSource = memoizeAsync(async (): Promise<ModelSource> => {
    if (defaultModel?.featureId !== undefined) {
      logger.debug(`[getDefaultModelSource] Using featureId: ${defaultModel.featureId}`);
      return defaultModel;
    }

    const resolvedConnectorId =
      defaultModel?.connectorId ??
      (await resolveAgentBuilderDefaultEndpoint({ request, searchInferenceEndpoints }))
        ?.connectorId;
    if (!resolvedConnectorId) {
      throw new Error('No connector available');
    }

    logger.debug(`[getDefaultConnectorId] Using connectorId: ${resolvedConnectorId}`);
    return { connectorId: resolvedConnectorId };
  });

  /**
   * Returns the connector id configured for the fast inference feature, or `undefined` when no
   * dedicated fast endpoint exists (no SO override, no EIS recommended endpoint).
   */
  const getFastModelConnectorId = memoizeAsync(async (): Promise<string | undefined> => {
    const { endpoints } = await searchInferenceEndpoints.endpoints.getForFeature(
      AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
      request,
      { onlyReturnConfigured: true }
    );
    return endpoints[0]?.connectorId;
  });

  // Memoized so the fallback is resolved (and logged) once per provider, as the fast connector
  // lookup always was.
  const getFastModelSource = memoizeAsync(async (): Promise<ModelSource> => {
    const fastConnectorId = await getFastModelConnectorId();
    if (fastConnectorId !== undefined) {
      return { connectorId: fastConnectorId };
    }

    const source = await getDefaultModelSource();
    const fallbackDescription =
      source.featureId !== undefined
        ? `default model from inference feature "${source.featureId}"`
        : `default connector: ${source.connectorId}`;
    logger.debug(
      `[model_provider] No dedicated fast inference endpoint found for feature "${AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID}" — falling back to ${fallbackDescription}. Fast model and default model are the SAME.`
    );
    return source;
  });

  const completedCalls: ModelCallInfo[] = [];

  const getUsageStats = (): ModelProviderStats => {
    return {
      calls: completedCalls,
    };
  };

  const createCompletionCallback = (
    getResolvedModel: () => { connectorId: string; connector: InferenceConnector }
  ): InferenceCompleteCallbackHandler => {
    return (event) => {
      const { connectorId, connector } = getResolvedModel();
      // Prefer model from provider response, fallback to connector-based model
      let modelName: string | undefined = event.model;
      if (!modelName && connector) {
        try {
          modelName = getConnectorModel(connector);
        } catch (e) {
          // ignore errors
        }
      }

      completedCalls.push({
        connectorId,
        tokens: event.tokens,
        model: modelName,
      });

      if (trackingService && connector) {
        try {
          const provider = getConnectorProvider(connector);
          trackingService.trackLLMUsage(provider, modelName);
        } catch (e) {
          // ignore errors
        }
      }
    };
  };

  const buildConnectorModel = async (
    connectorId: string,
    applyReasoning: boolean
  ): Promise<ScopedModel> => {
    const reasoning = applyReasoning && reasoningLevel ? { effort: reasoningLevel } : undefined;
    // `connector` is resolved below; completion callbacks only fire once the model is in use.
    const completionCallback = createCompletionCallback(() => ({ connectorId, connector }));

    const resolvedTelemetryMetadata = await getResolvedTelemetryMetadata();

    const chatModel = await inference.getChatModel({
      request,
      connectorId,
      callbacks: {
        complete: [completionCallback],
      },
      chatModelOptions: {
        telemetryMetadata: resolvedTelemetryMetadata,
        ...(maxContentLength !== undefined ? { maxContentLength } : {}),
        ...(reasoning ? { reasoning } : {}),
      },
    });

    const rawInferenceClient = inference.getClient({
      request,
      bindTo: {
        connectorId,
        metadata: { connectorTelemetry: resolvedTelemetryMetadata },
      },
      callbacks: {
        complete: [completionCallback],
      },
    });
    const inferenceClient = reasoning
      ? wrapBoundInferenceClientWithReasoning(rawInferenceClient, reasoning)
      : rawInferenceClient;
    const connector = await inferenceClient.getConnectorById(connectorId);

    return {
      connector,
      chatModel,
      inferenceClient,
    };
  };

  // Feature-sourced models delegate model selection to the inference plugin: the feature's
  // configured endpoint and reasoning settings apply, so no provider-level reasoning is injected
  // in the chat model options or on the bound client.
  const buildFeatureModel = async (featureId: string): Promise<ScopedModel> => {
    // `connector` is the feature's resolved connector, read from the chat model below; completion
    // callbacks only fire once the model is in use.
    const completionCallback = createCompletionCallback(() => ({
      connectorId: connector.connectorId,
      connector,
    }));

    const resolvedTelemetryMetadata = await getResolvedTelemetryMetadata();

    const chatModel = await inference.getChatModel({
      request,
      featureId,
      callbacks: {
        complete: [completionCallback],
      },
      chatModelOptions: {
        telemetryMetadata: resolvedTelemetryMetadata,
        ...(maxContentLength !== undefined ? { maxContentLength } : {}),
      },
    });
    const connector = chatModel.getConnector();

    const inferenceClient = inference.getClient({
      request,
      bindTo: {
        featureId,
        metadata: { connectorTelemetry: resolvedTelemetryMetadata },
      },
      callbacks: {
        complete: [completionCallback],
      },
    });

    return {
      connector,
      chatModel,
      inferenceClient,
    };
  };

  // Cache key encodes the source and, for connectors, whether reasoning applies, so the same
  // connector can serve both a reasoning-enabled and a reasoning-free variant when it is reached
  // through both the default path and the fast path.
  const buildScopedModel = memoizeAsyncByKey(
    ({ source, applyReasoning }: ScopedModelSpec): string =>
      source.featureId !== undefined
        ? `feature:${source.featureId}`
        : `connector:${source.connectorId}|${applyReasoning && reasoningLevel !== undefined}`,
    async ({ source, applyReasoning }: ScopedModelSpec): Promise<ScopedModel> => {
      if (source.featureId !== undefined) {
        return buildFeatureModel(source.featureId);
      }
      return buildConnectorModel(source.connectorId, applyReasoning);
    }
  );

  const getModelById = (
    connectorId: string,
    applyReasoning: boolean = true
  ): Promise<ScopedModel> => {
    return buildScopedModel({ source: { connectorId }, applyReasoning });
  };

  let ignoredReasoningWarned = false;
  const getDefaultModel = async (): Promise<ScopedModel> => {
    const source = await getDefaultModelSource();
    if (source.featureId !== undefined && reasoningLevel !== undefined && !ignoredReasoningWarned) {
      ignoredReasoningWarned = true;
      logger.warn(
        `Reasoning level "${reasoningLevel}" is ignored: the default model comes from inference feature "${source.featureId}", which owns its reasoning settings`
      );
    }
    return buildScopedModel({ source, applyReasoning: true });
  };

  const hasFastModel = memoizeAsync(async (): Promise<boolean> => {
    // Shares the memoized fast lookup with `selectModel`, so the lookup (and its fallback log)
    // happens once whichever runs first. A feature source here means the fast path fell back to a
    // feature-sourced default: no dedicated fast model.
    const fastSource = await getFastModelSource();
    if (fastSource.featureId !== undefined) {
      return false;
    }
    // A connector-sourced default is compared by id (the resolved connector id equals the source
    // id by construction); a feature-sourced one needs to be resolved by the inference plugin
    // first. A distinct id means a genuinely dedicated (cheaper/faster) fast model exists.
    const defaultSource = await getDefaultModelSource();
    const defaultConnectorId =
      defaultSource.connectorId ?? (await getDefaultModel()).connector.connectorId;
    return fastSource.connectorId !== defaultConnectorId;
  });

  const selectModel: ModelProvider['selectModel'] = async ({
    effortLevel = EffortLevels.medium,
  }) => {
    if (effortLevel !== EffortLevels.low) {
      return getDefaultModel();
    }

    const source = await getFastModelSource();
    if (source.featureId !== undefined) {
      // A feature-sourced default owns its reasoning settings: there is no reasoning-free variant.
      return getDefaultModel();
    }
    // Fast path never carries reasoning — cheap models are cheap on purpose. When the fast
    // connector falls back to the default, we still return a reasoning-free variant here.
    return getModelById(source.connectorId, false);
  };

  return {
    selectModel,
    getDefaultModel,
    getModelById: ({ connectorId }) => getModelById(connectorId),
    hasFastModel,
    getUsageStats,
  };
};

/**
 * Wraps a {@link BoundInferenceClient} so that `chatComplete` calls (direct and via `bindTo`)
 * default to the provider-scoped reasoning config. Caller-supplied `reasoning` on a call always
 * wins — the wrapper only injects when the caller did not provide one.
 */
const wrapBoundInferenceClientWithReasoning = (
  client: BoundInferenceClient,
  reasoning: { effort: ChatCompletionReasoningEffort }
): BoundInferenceClient => {
  const originalChatComplete = client.chatComplete;
  const wrappedChatComplete = ((options: Parameters<BoundInferenceClient['chatComplete']>[0]) => {
    const withReasoning = options.reasoning === undefined ? { ...options, reasoning } : options;
    return originalChatComplete(withReasoning);
  }) as BoundInferenceClient['chatComplete'];

  return {
    ...client,
    chatComplete: wrappedChatComplete,
    // Preserve reasoning through further binds so downstream callers keep the injected default.
    bindTo: (boundOptions) => {
      const bound = client.bindTo(boundOptions);
      return wrapBoundInferenceClientWithReasoning(bound, reasoning);
    },
  };
};
