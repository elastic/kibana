/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import { InferenceChatModel, type InferenceChatModelBaseParams } from '@kbn/inference-langchain';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { InferenceCallbacks } from '@kbn/inference-common';
import type { AnonymizationRule } from '@kbn/ai-anonymization-common';
import type {
  InferenceAnonymizationOptions,
  RegexWorkerService,
} from '@kbn/ai-anonymization-server';
import type {
  ActionsClientProvider,
  InferenceModelTarget,
  ScopedFeatureEndpointResolver,
} from '../types';
import { getConnectorById } from '../util/get_connector_by_id';
import { resolveFeatureEndpointOrThrow } from '../util/resolve_feature_endpoint';
import { createClient } from './create_client';
import type { InferenceEndpointIdCache } from '../util/inference_endpoint_id_cache';
import type { TokenUsageLogger } from '../token_usage';

export type CreateChatModelOptions = {
  request: KibanaRequest;
  namespace?: string;
  actions: ActionsClientProvider;
  logger: Logger;
  chatModelOptions: Omit<InferenceChatModelBaseParams, 'connector' | 'logger'>;
  anonymizationRulesPromise: Promise<AnonymizationRule[]>;
  regexWorker: RegexWorkerService;
  esClient: ElasticsearchClient;
  replacementsEsClient?: ElasticsearchClient;
  endpointIdCache: InferenceEndpointIdCache;
  callbacks?: InferenceCallbacks;
  anonymization?: InferenceAnonymizationOptions;
  tokenUsageLogger?: TokenUsageLogger;
  isTokenUsageTrackingEnabled?: () => Promise<boolean>;
  isDefaultConnectorOnly?: () => Promise<boolean>;
  getDefaultConnectorId?: () => Promise<string | undefined>;
  resolveConnectorId?: (connectorId: string) => Promise<string>;
  shouldStreamInferenceEndpoint?: (service?: string) => Promise<boolean>;
  resolveFeatureEndpoint?: ScopedFeatureEndpointResolver;
} & InferenceModelTarget;

/**
 * Resolves the connector the model is built on: the feature's top endpoint when built from a
 * `featureId`, the given connector otherwise. Only the connector is used from a resolved feature
 * endpoint: the feature's `reasoning` applies on each call through `chatComplete({ featureId })`.
 */
const resolveTargetConnectorId = async ({
  target,
  resolveFeatureEndpoint,
}: {
  target: InferenceModelTarget;
  resolveFeatureEndpoint?: ScopedFeatureEndpointResolver;
}): Promise<string> => {
  if (target.featureId === undefined) {
    return target.connectorId;
  }
  const { connectorId } = await resolveFeatureEndpointOrThrow({
    featureId: target.featureId,
    resolveFeatureEndpoint,
  });
  return connectorId;
};

export const createChatModel = async (
  options: CreateChatModelOptions
): Promise<InferenceChatModel> => {
  const {
    request,
    namespace,
    featureId,
    actions,
    logger,
    chatModelOptions,
    anonymizationRulesPromise,
    regexWorker,
    esClient,
    replacementsEsClient,
    endpointIdCache,
    callbacks,
    anonymization,
    tokenUsageLogger,
    isTokenUsageTrackingEnabled,
    isDefaultConnectorOnly,
    getDefaultConnectorId,
    resolveConnectorId,
    shouldStreamInferenceEndpoint,
    resolveFeatureEndpoint,
  } = options;
  const client = createClient({
    actions,
    request,
    namespace,
    anonymizationRulesPromise,
    regexWorker,
    esClient,
    ...(replacementsEsClient ? { replacementsEsClient } : {}),
    endpointIdCache,
    logger,
    callbacks,
    anonymization,
    tokenUsageLogger,
    isTokenUsageTrackingEnabled,
    isDefaultConnectorOnly,
    getDefaultConnectorId,
    resolveConnectorId,
    shouldStreamInferenceEndpoint,
    resolveFeatureEndpoint,
  });
  const connectorId = await resolveTargetConnectorId({ target: options, resolveFeatureEndpoint });
  const connector = await getConnectorById({ connectorId, actions, request, esClient, logger });
  return new InferenceChatModel({
    ...chatModelOptions,
    chatComplete: client.chatComplete,
    connector,
    featureId,
  });
};
