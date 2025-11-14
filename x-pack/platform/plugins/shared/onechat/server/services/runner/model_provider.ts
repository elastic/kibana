/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ModelProvider,
  ScopedModel,
  ModelProviderStats,
  ModelCallInfo,
} from '@kbn/onechat-server/runner';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { InferenceConnector } from '@kbn/inference-common';
import { getConnectorProvider, getConnectorModel } from '@kbn/inference-common';
import type { BaseMessage } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { ChatResult } from '@langchain/core/outputs';
import type { InferenceCompleteCallbackHandler } from '@kbn/inference-common/src/chat_complete';
import type { TrackingService } from '../../telemetry';
import { MODEL_TELEMETRY_METADATA } from '../../telemetry';

type InferenceChatModelCallOptions = InferenceChatModel['ParsedCallOptions'];

export interface CreateModelProviderOpts {
  inference: InferenceServerStart;
  request: KibanaRequest;
  defaultConnectorId?: string;
  trackingService?: TrackingService;
}

export type CreateModelProviderFactoryFn = (
  opts: Omit<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>
) => ModelProviderFactoryFn;

export type ModelProviderFactoryFn = (
  opts: Pick<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>
) => ModelProvider;

/**
 * Wraps an InferenceChatModel with tracking for LLM usage
 * @param chatModel - The chat model to wrap
 * @param connector - The connector associated with the model
 * @param trackingService - Optional tracking service for telemetry
 * @returns The wrapped chat model with tracking
 */
function wrapChatModelWithTracking(
  chatModel: InferenceChatModel,
  connector: InferenceConnector,
  trackingService?: TrackingService
): InferenceChatModel {
  if (!trackingService) {
    return chatModel;
  }

  const originalGenerate = chatModel._generate.bind(chatModel);

  chatModel._generate = async function (
    baseMessages: BaseMessage[],
    options: InferenceChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      const provider = getConnectorProvider(connector);
      const model = getConnectorModel(connector);
      trackingService.trackLLMUsage(String(provider), model);
    } catch (error) {
      // non blocking catch
    }

    return originalGenerate(baseMessages, options, runManager);
  };

  return chatModel;
}

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
 * Utility function to create a {@link ModelProvider}
 */
export const createModelProvider = ({
  inference,
  request,
  defaultConnectorId,
  trackingService,
}: CreateModelProviderOpts): ModelProvider => {
  const getDefaultConnectorId = async () => {
    if (defaultConnectorId) {
      return defaultConnectorId;
    }
    const defaultConnector = await inference.getDefaultConnector(request);
    return defaultConnector.connectorId;
  };

  const completedCalls: ModelCallInfo[] = [];

  const getUsageStats = (): ModelProviderStats => {
    return {
      calls: completedCalls,
    };
  };

  const getModel = async (connectorId: string): Promise<ScopedModel> => {
    const completionCallback: InferenceCompleteCallbackHandler = (event) => {
      completedCalls.push({
        connectorId,
        tokens: event.tokens,
      });
    };

    const chatModel = await inference.getChatModel({
      request,
      connectorId,
      callbacks: {
        complete: [completionCallback],
      },
      chatModelOptions: {
        telemetryMetadata: MODEL_TELEMETRY_METADATA,
      },
    });

    const inferenceClient = inference.getClient({
      request,
      bindTo: { connectorId },
      callbacks: {
        complete: [completionCallback],
      },
    });
    const connector = await inferenceClient.getConnectorById(connectorId);

    const wrappedChatModel = wrapChatModelWithTracking(chatModel, connector, trackingService);

    return {
      connector,
      chatModel: wrappedChatModel,
      inferenceClient,
    };
  };

  return {
    getDefaultModel: async () => getModel(await getDefaultConnectorId()),
    getModel: ({ connectorId }) => getModel(connectorId),
    getUsageStats,
  };
};
