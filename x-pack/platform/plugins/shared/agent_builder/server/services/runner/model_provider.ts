/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import type {
  ModelProvider,
  ScopedModel,
  ModelProviderStats,
  ModelCallInfo,
} from '@kbn/agent-builder-server/runner';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { getConnectorProvider, getConnectorModel } from '@kbn/inference-common';
import type { InferenceCompleteCallbackHandler } from '@kbn/inference-common/src/chat_complete';
import type { TrackingService } from '../../telemetry';
import { MODEL_TELEMETRY_METADATA } from '../../telemetry';
import { resolveSelectedConnectorId } from '../../utils/resolve_selected_connector_id';

export interface CreateModelProviderOpts {
  inference: InferenceServerStart;
  request: KibanaRequest;
  defaultConnectorId?: string;
  trackingService?: TrackingService;
  uiSettings: UiSettingsServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export type CreateModelProviderFactoryFn = (
  opts: Omit<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>
) => ModelProviderFactoryFn;

export type ModelProviderFactoryFn = (
  opts: Pick<CreateModelProviderOpts, 'request' | 'defaultConnectorId'>
) => ModelProvider;

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
  uiSettings,
  savedObjects,
}: CreateModelProviderOpts): ModelProvider => {
  const getDefaultConnectorId = async () => {
    const resolvedConnectorId = await resolveSelectedConnectorId({
      uiSettings,
      savedObjects,
      request,
      connectorId: defaultConnectorId,
      inference,
    });
    if (!resolvedConnectorId) {
      throw new Error('No connector available');
    }
    return resolvedConnectorId;
  };

  const completedCalls: ModelCallInfo[] = [];

  const getUsageStats = (): ModelProviderStats => {
    return {
      calls: completedCalls,
    };
  };

  const getModel = async (connectorId: string): Promise<ScopedModel> => {
    const completionCallback: InferenceCompleteCallbackHandler = (event) => {
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

    return {
      connector,
      chatModel,
      inferenceClient,
    };
  };

  return {
    getDefaultModel: async () => getModel(await getDefaultConnectorId()),
    getModel: ({ connectorId }) => getModel(connectorId),
    getUsageStats,
  };
};
