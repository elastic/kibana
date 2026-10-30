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
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import { createAgentNotFoundError, isAgentNotFoundError } from '@kbn/agent-builder-common';
import type { ModelProvider, ModelSource } from '@kbn/agent-builder-server/runner';
import type { AgentRegistry, AgentsServiceStart } from '../../agents';
import { createModelProvider } from '../runner/model_provider';

export interface ResolvedServices {
  modelProvider: ModelProvider;
  /** Where the run's default model comes from; `undefined` leaves the provider's own default. */
  defaultModel?: ModelSource;
}

const getAgentConfiguration = async ({
  agentRegistry,
  agentId,
}: {
  agentRegistry: AgentRegistry;
  agentId: string;
}): Promise<AgentConfiguration> => {
  try {
    const { configuration } = await agentRegistry.get(agentId);
    return configuration;
  } catch (error) {
    throw isAgentNotFoundError(error)
      ? createAgentNotFoundError({
          agentId,
          customMessage: `Agent "${agentId}" not found or not available`,
        })
      : error;
  }
};

/**
 * Decides where the default model of a run comes from, using the first of:
 * 1. The connector requested by the caller.
 * 2. The inference feature the execution was given (`inferenceFeatureId`).
 * 3. The inference feature the agent declares.
 * Returns `undefined` when none applies, leaving the provider on the Agent Builder default.
 */
const selectModelSource = ({
  connectorId,
  inferenceFeatureId,
  agentInferenceFeatureId,
}: {
  connectorId?: string;
  inferenceFeatureId?: string;
  agentInferenceFeatureId?: string;
}): ModelSource | undefined => {
  if (connectorId !== undefined) {
    return { connectorId };
  }
  const featureId = inferenceFeatureId ?? agentInferenceFeatureId;
  return featureId !== undefined ? { featureId } : undefined;
};

/**
 * Resolves the model provider an agent execution runs with, and the model source it was built
 * from. No connector is resolved here: a feature source is handed to the inference plugin as is,
 * and a run with no source fails at its first model use when no default endpoint is available.
 *
 * @param connectorId - Connector requested by the caller. When set, inference features are ignored.
 * @param inferenceFeatureId - Inference feature the execution was given; overrides the agent's.
 * @returns The model provider and the model source the run uses.
 * @throws {AgentBuilderError} with code `agentNotFound` when the agent does not exist or the
 * caller cannot access it.
 */
export const resolveServices = async ({
  agentId,
  connectorId,
  inferenceFeatureId,
  telemetryMetadata,
  request,
  logger,
  inference,
  agentService,
  searchInferenceEndpoints,
  spaces,
  security,
  elasticsearch,
}: {
  agentId: string;
  connectorId?: string;
  inferenceFeatureId?: string;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  request: KibanaRequest;
  logger: Logger;
  inference: InferenceServerStart;
  agentService: AgentsServiceStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart;
  spaces?: SpacesPluginStart;
  security: SecurityServiceStart;
  elasticsearch: ElasticsearchServiceStart;
}): Promise<ResolvedServices> => {
  // Always loaded, so an unavailable agent fails with `agentNotFound` even when a connector is passed.
  const agentRegistry = await agentService.getRegistry({ request });
  const { inference_feature_id: agentInferenceFeatureId } = await getAgentConfiguration({
    agentRegistry,
    agentId,
  });

  const defaultModel = selectModelSource({
    connectorId,
    inferenceFeatureId,
    agentInferenceFeatureId,
  });

  const modelProvider = createModelProvider({
    inference,
    request,
    defaultModel,
    telemetryMetadata,
    logger,
    searchInferenceEndpoints,
    spaces,
    security,
    elasticsearch,
  });

  return {
    modelProvider,
    defaultModel,
  };
};
