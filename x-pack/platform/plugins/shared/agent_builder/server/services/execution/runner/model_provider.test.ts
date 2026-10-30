/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { InferenceCompleteCallbackHandler } from '@kbn/inference-common/src/chat_complete';
import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import {
  AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
  AGENT_BUILDER_INFERENCE_FEATURE_ID,
} from '@kbn/agent-builder-common/constants';
import type { ModelSource } from '@kbn/agent-builder-server/runner';
import type { TrackingService } from '../../../telemetry';
import { MODEL_TELEMETRY_METADATA } from '../../../telemetry';
import { createModelProvider, createModelProviderFactory } from './model_provider';

interface EndpointMock {
  connectorId: string;
  isRecommended?: boolean;
}

const createSearchInferenceEndpointsMock = ({
  mainEndpoints,
  fastEndpoints,
}: {
  mainEndpoints: EndpointMock[];
  fastEndpoints: EndpointMock[];
}): jest.Mocked<SearchInferenceEndpointsPluginStart> => {
  return {
    features: {} as any,
    endpoints: {
      getForFeature: jest.fn(async (featureId: string) => ({
        endpoints:
          featureId === AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID ? fastEndpoints : mainEndpoints,
        warnings: [],
        soEntryFound: false,
      })),
    },
  } as unknown as jest.Mocked<SearchInferenceEndpointsPluginStart>;
};

const createTrackingServiceMock = (): jest.Mocked<Pick<TrackingService, 'trackLLMUsage'>> => ({
  trackLLMUsage: jest.fn(),
});

const setupDeps = ({
  mainEndpoints = [{ connectorId: 'default-connector' }],
  fastEndpoints = [],
  defaultModel,
}: {
  mainEndpoints?: EndpointMock[];
  fastEndpoints?: EndpointMock[];
  defaultModel?: ModelSource;
} = {}) => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();
  const inference = inferenceMock.createStartContract();
  const searchInferenceEndpoints = createSearchInferenceEndpointsMock({
    mainEndpoints,
    fastEndpoints,
  });
  const trackingService = createTrackingServiceMock() as unknown as TrackingService;

  return {
    inference,
    request,
    defaultModel,
    trackingService,
    logger,
    searchInferenceEndpoints,
  };
};

const createConnectorMock = (overrides: Record<string, any> = {}) => ({
  connectorId: 'default-connector',
  type: '.gen-ai',
  config: { providerConfig: { provider: 'openai' } },
  ...overrides,
});

const getCompletionCallback = (
  inference: ReturnType<typeof inferenceMock.createStartContract>,
  callIndex = 0
): InferenceCompleteCallbackHandler => {
  const completeCallbacks = inference.getChatModel.mock.calls[callIndex][0].callbacks!.complete!;
  const callback = Array.isArray(completeCallbacks) ? completeCallbacks[0] : completeCallbacks;
  return callback;
};

const setupChatAndClient = (inference: ReturnType<typeof inferenceMock.createStartContract>) => {
  const chatModel = { kind: 'chat-model' };
  const getConnectorById = jest.fn().mockResolvedValue(createConnectorMock());
  const inferenceClient = { getConnectorById };

  inference.getChatModel.mockResolvedValue(chatModel as any);
  inference.getClient.mockReturnValue(inferenceClient as any);

  return { chatModel, inferenceClient, getConnectorById };
};

const createInferenceConnectorMock = (
  overrides: Partial<InferenceConnector> = {}
): InferenceConnector => ({
  connectorId: 'default-connector',
  name: 'Default connector',
  type: InferenceConnectorType.OpenAI,
  config: { providerConfig: { provider: 'openai' } },
  capabilities: {},
  isInferenceEndpoint: false,
  isPreconfigured: false,
  ...overrides,
});

/**
 * Builds a feature-mode chat model mock exposing only the members the provider relies on; the
 * `Pick` keeps the mock checked against the `InferenceChatModel` contract.
 */
const createFeatureChatModelMock = (connector: InferenceConnector): InferenceChatModel => {
  const chatModel: Pick<InferenceChatModel, 'getConnector'> = {
    getConnector: () => connector,
  };
  return chatModel as InferenceChatModel;
};

/**
 * Builds a bound client mock exposing only the members the provider relies on; the `Pick` keeps
 * the mock checked against the `BoundInferenceClient` contract.
 */
const createBoundInferenceClientMock = (): BoundInferenceClient => {
  const client: Pick<BoundInferenceClient, 'chatComplete' | 'bindTo' | 'getConnectorById'> = {
    chatComplete: jest.fn(),
    bindTo: jest.fn(),
    getConnectorById: jest.fn().mockResolvedValue(createInferenceConnectorMock()),
  };
  return client as BoundInferenceClient;
};

/**
 * Mocks the feature path: `getChatModel` resolves to a chat model exposing the feature's resolved
 * connector through `getConnector()`, and `getClient` returns a feature-bound client.
 */
const setupFeatureChatAndClient = (
  inference: ReturnType<typeof inferenceMock.createStartContract>,
  { connectorId = 'feature-connector' }: { connectorId?: string } = {}
) => {
  const featureConnector = createInferenceConnectorMock({ connectorId });
  const chatModel = createFeatureChatModelMock(featureConnector);
  const inferenceClient = createBoundInferenceClientMock();
  const chatCompleteMock = jest.mocked(inferenceClient.chatComplete);

  inference.getChatModel.mockResolvedValue(chatModel);
  inference.getClient.mockReturnValue(inferenceClient);

  return { chatModel, inferenceClient, chatCompleteMock, featureConnector };
};

describe('createModelProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDefaultModel', () => {
    it('resolves the default connector id and returns a scoped model', async () => {
      const deps = setupDeps();
      const { chatModel, inferenceClient } = setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      const model = await provider.getDefaultModel();

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
        AGENT_BUILDER_INFERENCE_FEATURE_ID,
        deps.request
      );
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          request: deps.request,
          connectorId: 'default-connector',
        })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          request: deps.request,
          bindTo: {
            connectorId: 'default-connector',
            metadata: { connectorTelemetry: MODEL_TELEMETRY_METADATA },
          },
        })
      );
      expect(model.chatModel).toBe(chatModel);
      expect(model.inferenceClient).toBe(inferenceClient);
      expect(model.connector).toEqual(createConnectorMock());
    });

    it('passes maxContentLength to the chat model options', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, maxContentLength: 10 * 1024 * 1024 });
      await provider.getDefaultModel();

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.objectContaining({
            maxContentLength: 10 * 1024 * 1024,
          }),
        })
      );
    });

    it('throws when no connector can be resolved', async () => {
      const deps = setupDeps({ mainEndpoints: [] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);

      await expect(provider.getDefaultModel()).rejects.toThrow('No connector available');
    });

    it('memoizes the default connector resolution across calls', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();
      await provider.getDefaultModel();

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledTimes(1);
      expect(deps.inference.getChatModel).toHaveBeenCalledTimes(1);
    });

    it('uses the explicit connectorId source without resolving feature endpoints', async () => {
      const deps = setupDeps({ defaultModel: { connectorId: 'explicit-connector' } });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).not.toHaveBeenCalled();
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'explicit-connector' })
      );
    });

    it('logs the connector id in use for both explicit and resolved connector defaults', async () => {
      const explicitDeps = setupDeps({ defaultModel: { connectorId: 'explicit-connector' } });
      setupChatAndClient(explicitDeps.inference);
      await createModelProvider(explicitDeps).getDefaultModel();

      expect(explicitDeps.logger.debug).toHaveBeenCalledWith(
        '[getDefaultConnectorId] Using connectorId: explicit-connector'
      );

      const resolvedDeps = setupDeps();
      setupChatAndClient(resolvedDeps.inference);
      await createModelProvider(resolvedDeps).getDefaultModel();

      expect(resolvedDeps.logger.debug).toHaveBeenCalledWith(
        '[getDefaultConnectorId] Using connectorId: default-connector'
      );
    });

    it('builds the default model from a featureId via getChatModel and a feature-bound client', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      const { chatModel, inferenceClient } = setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      const model = await provider.getDefaultModel();

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).not.toHaveBeenCalled();
      expect(deps.inference.getChatModel).toHaveBeenCalledTimes(1);
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ request: deps.request, featureId: 'my_feature' })
      );
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.not.objectContaining({ connectorId: expect.anything() })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          request: deps.request,
          bindTo: expect.objectContaining({
            featureId: 'my_feature',
            metadata: { connectorTelemetry: MODEL_TELEMETRY_METADATA },
          }),
        })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          bindTo: expect.not.objectContaining({ connectorId: expect.anything() }),
        })
      );
      expect(model.chatModel).toBe(chatModel);
      expect(model.inferenceClient).toBe(inferenceClient);
    });

    it('does not inject reasoning into a feature-sourced default model', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      const { chatCompleteMock } = setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      const model = await provider.getDefaultModel();
      await model.inferenceClient.chatComplete({ messages: [] });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.not.objectContaining({ reasoning: expect.anything() }),
        })
      );
      // The feature-bound client is returned as is: no reasoning wrapper around chatComplete.
      expect(chatCompleteMock).toHaveBeenCalledWith({ messages: [] });
      expect(chatCompleteMock).toHaveBeenCalledWith(
        expect.not.objectContaining({ reasoning: expect.anything() })
      );
    });

    it('drops the caller reasoning level with a warning on a feature-sourced default', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      await provider.getDefaultModel();
      await provider.getDefaultModel();

      expect(deps.logger.warn).toHaveBeenCalledTimes(1);
      expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('my_feature'));
      expect(deps.logger.warn).toHaveBeenCalledWith(expect.stringContaining('high'));
    });

    it('warns only once when the first default-model builds run concurrently', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      await Promise.all([provider.getDefaultModel(), provider.getDefaultModel()]);
      await provider.getDefaultModel();

      expect(deps.logger.warn).toHaveBeenCalledTimes(1);
      expect(deps.inference.getChatModel).toHaveBeenCalledTimes(1);
    });

    it('does not warn on a feature-sourced default when no reasoning level is set', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      expect(deps.logger.warn).not.toHaveBeenCalled();
    });

    it('returns the resolved connector from the chat model on the feature path', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      const { featureConnector, inferenceClient } = setupFeatureChatAndClient(deps.inference, {
        connectorId: 'resolved-feature-connector',
      });

      const provider = createModelProvider(deps);
      const model = await provider.getDefaultModel();

      expect(model.connector).toBe(featureConnector);
      expect(model.connector.connectorId).toBe('resolved-feature-connector');
      expect(inferenceClient.getConnectorById).not.toHaveBeenCalled();
    });

    it('records usage against the feature resolved connector id', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' } });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      const completionCallback = getCompletionCallback(deps.inference);
      completionCallback({
        model: 'gpt-4o',
        tokens: { prompt: 10, completion: 20, total: 30 },
      });

      expect(provider.getUsageStats()).toEqual({
        calls: [
          {
            connectorId: 'feature-connector',
            tokens: { prompt: 10, completion: 20, total: 30 },
            model: 'gpt-4o',
          },
        ],
      });
    });
  });

  describe('getModelById', () => {
    it('uses the provided connectorId verbatim', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getModelById({ connectorId: 'specific-connector' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'specific-connector' })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          bindTo: {
            connectorId: 'specific-connector',
            metadata: { connectorTelemetry: MODEL_TELEMETRY_METADATA },
          },
        })
      );
    });
  });

  describe('selectModel', () => {
    it('uses the default connector when effortLevel is medium', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'medium' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'default-connector' })
      );
    });

    it('uses the default connector when effortLevel is omitted', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({});

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'default-connector' })
      );
    });

    it('uses the fast endpoint returned by getForFeature when effortLevel is low', async () => {
      const deps = setupDeps({
        fastEndpoints: [{ connectorId: 'fast-connector' }],
      });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
        AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
        deps.request,
        { onlyReturnConfigured: true }
      );
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'fast-connector' })
      );
    });

    it('always uses endpoints[0] — trusting getForFeature priority ordering', async () => {
      // getForFeature with onlyReturnConfigured returns endpoints already ordered
      // (SO override → EIS recommended). Agent Builder just takes endpoints[0].
      const deps = setupDeps({
        fastEndpoints: [{ connectorId: 'first-endpoint' }, { connectorId: 'second-endpoint' }],
      });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'first-endpoint' })
      );
    });

    it('falls back to the default connector when no fast endpoint exists', async () => {
      const deps = setupDeps({ fastEndpoints: [] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'default-connector' })
      );
    });

    it('memoizes the fast connector resolution across calls', async () => {
      const deps = setupDeps({
        fastEndpoints: [{ connectorId: 'fast-connector', isRecommended: true }],
      });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledTimes(1);
    });

    it('logs the fast-model fallback to the default connector once across low-effort calls', async () => {
      const deps = setupDeps({ fastEndpoints: [] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });
      await provider.selectModel({ effortLevel: 'low' });

      const fallbackLogs = deps.logger.debug.mock.calls.filter(([message]) =>
        String(message).includes('No dedicated fast inference endpoint found')
      );
      expect(fallbackLogs).toHaveLength(1);
      expect(fallbackLogs[0][0]).toBe(
        `[model_provider] No dedicated fast inference endpoint found for feature "${AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID}" — falling back to default connector: default-connector. Fast model and default model are the SAME.`
      );
    });

    it('does not log the fast-model fallback when a dedicated fast endpoint exists', async () => {
      const deps = setupDeps({ fastEndpoints: [{ connectorId: 'fast-connector' }] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.logger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('No dedicated fast inference endpoint found')
      );
    });

    it('returns the feature-sourced default model for low effort when no fast endpoint exists', async () => {
      const deps = setupDeps({ defaultModel: { featureId: 'my_feature' }, fastEndpoints: [] });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      const lowEffortModel = await provider.selectModel({ effortLevel: 'low' });
      const defaultModel = await provider.getDefaultModel();

      expect(lowEffortModel).toBe(defaultModel);
      expect(deps.inference.getChatModel).toHaveBeenCalledTimes(1);
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'my_feature' })
      );
      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledTimes(1);
      expect(deps.searchInferenceEndpoints.endpoints.getForFeature).toHaveBeenCalledWith(
        AGENT_BUILDER_FAST_INFERENCE_FEATURE_ID,
        deps.request,
        { onlyReturnConfigured: true }
      );
    });

    it('returns the fast connector model for low effort when a fast endpoint exists', async () => {
      const deps = setupDeps({
        defaultModel: { featureId: 'my_feature' },
        fastEndpoints: [{ connectorId: 'fast-connector' }],
      });
      setupFeatureChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      const lowEffortModel = await provider.selectModel({ effortLevel: 'low' });
      const defaultModel = await provider.getDefaultModel();

      // The fast connector model and the feature model are memoized under distinct keys.
      expect(lowEffortModel).not.toBe(defaultModel);
      expect(deps.inference.getChatModel).toHaveBeenCalledTimes(2);
      expect(deps.inference.getChatModel).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          connectorId: 'fast-connector',
          chatModelOptions: expect.not.objectContaining({ reasoning: expect.anything() }),
        })
      );
      expect(deps.inference.getChatModel).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ featureId: 'my_feature' })
      );
    });
  });

  describe('hasFastModel', () => {
    it('is false when no dedicated fast endpoint is configured', async () => {
      const deps = setupDeps({ fastEndpoints: [] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);

      await expect(provider.hasFastModel()).resolves.toBe(false);
    });

    it('is true when a distinct fast endpoint exists next to a connector-sourced default', async () => {
      const deps = setupDeps({ fastEndpoints: [{ connectorId: 'fast-connector' }] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);

      await expect(provider.hasFastModel()).resolves.toBe(true);
      // A connector-sourced default is compared by id: no model needs to be built.
      expect(deps.inference.getChatModel).not.toHaveBeenCalled();
    });

    it('is false when the fast endpoint is the feature resolved connector', async () => {
      const deps = setupDeps({
        defaultModel: { featureId: 'my_feature' },
        fastEndpoints: [{ connectorId: 'feature-connector' }],
      });
      setupFeatureChatAndClient(deps.inference, { connectorId: 'feature-connector' });

      const provider = createModelProvider(deps);

      await expect(provider.hasFastModel()).resolves.toBe(false);
    });

    it('is true when a distinct fast endpoint exists next to a feature-sourced default', async () => {
      const deps = setupDeps({
        defaultModel: { featureId: 'my_feature' },
        fastEndpoints: [{ connectorId: 'fast-connector' }],
      });
      setupFeatureChatAndClient(deps.inference, { connectorId: 'feature-connector' });

      const provider = createModelProvider(deps);

      await expect(provider.hasFastModel()).resolves.toBe(true);
      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({ featureId: 'my_feature' })
      );
    });
  });

  describe('telemetryMetadata', () => {
    it('defaults to the Agent Builder telemetry and binds it on the inference client when none is provided', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: { telemetryMetadata: MODEL_TELEMETRY_METADATA },
        })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          bindTo: {
            connectorId: 'default-connector',
            metadata: { connectorTelemetry: MODEL_TELEMETRY_METADATA },
          },
        })
      );
    });

    it('uses the provided telemetryMetadata for the chat model and binds it on the inference client', async () => {
      const telemetryMetadata = {
        pluginId: 'streams_significant_events_discovery',
        aggregateBy: 'streams_significant_events',
      };
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, telemetryMetadata });
      await provider.getDefaultModel();

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: { telemetryMetadata },
        })
      );
      expect(deps.inference.getClient).toHaveBeenCalledWith(
        expect.objectContaining({
          bindTo: {
            connectorId: 'default-connector',
            metadata: { connectorTelemetry: telemetryMetadata },
          },
        })
      );
    });
  });

  describe('reasoningLevel', () => {
    it('omits reasoning from chatModelOptions when reasoningLevel is not set', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.not.objectContaining({ reasoning: expect.anything() }),
        })
      );
    });

    it('bakes reasoning.effort into the chat model when reasoningLevel is set', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      await provider.getDefaultModel();

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          chatModelOptions: expect.objectContaining({ reasoning: { effort: 'high' } }),
        })
      );
    });

    it('does not apply reasoning when the fast connector is resolved', async () => {
      const deps = setupDeps({
        fastEndpoints: [{ connectorId: 'fast-connector', isRecommended: true }],
      });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'fast-connector',
          chatModelOptions: expect.not.objectContaining({ reasoning: expect.anything() }),
        })
      );
    });

    it('does not apply reasoning when the fast model falls back to the default connector', async () => {
      // No dedicated fast endpoint → fastConnectorId === defaultConnectorId, so the fast path
      // must still skip reasoning even though the connector id matches the default.
      const deps = setupDeps({ fastEndpoints: [] });
      setupChatAndClient(deps.inference);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'high' });
      await provider.selectModel({ effortLevel: 'low' });

      expect(deps.inference.getChatModel).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'default-connector',
          chatModelOptions: expect.not.objectContaining({ reasoning: expect.anything() }),
        })
      );
    });

    it('wraps chatComplete on the inference client to inject reasoning by default', async () => {
      const deps = setupDeps();
      const chatCompleteMock = jest.fn().mockResolvedValue(undefined);
      const boundClient = {
        chatComplete: chatCompleteMock,
        bindTo: jest.fn(),
        getConnectorById: jest.fn().mockResolvedValue(createConnectorMock()),
      };
      deps.inference.getChatModel.mockResolvedValue({} as any);
      deps.inference.getClient.mockReturnValue(boundClient as any);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'medium' });
      const model = await provider.getDefaultModel();
      await model.inferenceClient.chatComplete({ messages: [] } as any);

      expect(chatCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: { effort: 'medium' } })
      );
    });

    it('lets a caller-supplied reasoning override the injected default', async () => {
      const deps = setupDeps();
      const chatCompleteMock = jest.fn().mockResolvedValue(undefined);
      const boundClient = {
        chatComplete: chatCompleteMock,
        bindTo: jest.fn(),
        getConnectorById: jest.fn().mockResolvedValue(createConnectorMock()),
      };
      deps.inference.getChatModel.mockResolvedValue({} as any);
      deps.inference.getClient.mockReturnValue(boundClient as any);

      const provider = createModelProvider({ ...deps, reasoningLevel: 'medium' });
      const model = await provider.getDefaultModel();
      await model.inferenceClient.chatComplete({
        messages: [],
        reasoning: { effort: 'none' },
      } as any);

      expect(chatCompleteMock).toHaveBeenCalledWith(
        expect.objectContaining({ reasoning: { effort: 'none' } })
      );
    });
  });

  describe('getUsageStats', () => {
    it('returns no calls before any completion event', () => {
      const deps = setupDeps();
      const provider = createModelProvider(deps);

      expect(provider.getUsageStats()).toEqual({ calls: [] });
    });

    it('records calls and forwards usage to the tracking service when completion fires', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);

      const provider = createModelProvider(deps);
      await provider.getDefaultModel();

      const completionCallback = getCompletionCallback(deps.inference);
      completionCallback({
        model: 'gpt-4o',
        tokens: { prompt: 10, completion: 20, total: 30 },
      } as any);

      expect(provider.getUsageStats()).toEqual({
        calls: [
          {
            connectorId: 'default-connector',
            tokens: { prompt: 10, completion: 20, total: 30 },
            model: 'gpt-4o',
          },
        ],
      });
      expect(deps.trackingService!.trackLLMUsage).toHaveBeenCalledWith(
        expect.any(String),
        'gpt-4o'
      );
    });

    it('does not throw when tracking service is not provided', async () => {
      const deps = setupDeps();
      setupChatAndClient(deps.inference);
      const provider = createModelProvider({ ...deps, trackingService: undefined });
      await provider.getDefaultModel();

      const completionCallback = getCompletionCallback(deps.inference);
      expect(() =>
        completionCallback({
          model: 'gpt-4o',
          tokens: { prompt: 1, completion: 2, total: 3 },
        } as any)
      ).not.toThrow();

      expect(provider.getUsageStats().calls).toHaveLength(1);
    });
  });
});

describe('createModelProviderFactory', () => {
  it('produces a factory that injects request-scoped options', async () => {
    const deps = setupDeps();
    setupChatAndClient(deps.inference);

    const factory = createModelProviderFactory({
      inference: deps.inference,
      trackingService: deps.trackingService,
      logger: deps.logger,
      searchInferenceEndpoints: deps.searchInferenceEndpoints,
    });

    const provider = factory({
      request: deps.request,
      defaultModel: { connectorId: 'override-connector' },
    });
    await provider.getDefaultModel();

    expect(deps.inference.getChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        request: deps.request,
        connectorId: 'override-connector',
      })
    );
  });
});
