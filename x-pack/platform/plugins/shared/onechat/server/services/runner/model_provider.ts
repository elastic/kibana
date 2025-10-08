/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ModelProvider, ScopedModel } from '@kbn/onechat-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { MODEL_TELEMETRY_METADATA } from '../../telemetry';

export interface CreateModelProviderOpts {
  inference: InferenceServerStart;
  request: KibanaRequest;
  defaultConnectorId?: string;
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
}: CreateModelProviderOpts): ModelProvider => {
  const getDefaultConnectorId = async () => {
    if (defaultConnectorId) {
      return defaultConnectorId;
    }
    const defaultConnector = await inference.getDefaultConnector(request);
    return defaultConnector.connectorId;
  };

  const getModel = async (connectorId: string): Promise<ScopedModel> => {
    const chatModel = await inference.getChatModel({
      request,
      connectorId,
      chatModelOptions: {
        telemetryMetadata: MODEL_TELEMETRY_METADATA,
      },
    });

    const inferenceClient = inference.getClient({ request, bindTo: { connectorId } });
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
  };
};
