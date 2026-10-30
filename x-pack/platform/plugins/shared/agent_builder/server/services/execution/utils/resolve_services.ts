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
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AgentRegistry, AgentsServiceStart } from '../../agents';
import { createModelProvider } from '../runner/model_provider';
import { resolveExecutionConnectorId } from './resolve_execution_connector_id';

export interface ResolvedServices {
  modelProvider: ModelProvider;
  selectedConnectorId: string;
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
 * Resolves the model provider an agent execution runs with.
 *
 * @param connectorId - Connector requested by the caller. When set, the agent's inference feature
 * is ignored.
 * @returns The model provider and the selected connector the run uses.
 * @throws {AgentBuilderError} with code `agentNotFound` when the agent does not exist or the
 * caller cannot access it.
 * @throws {Error} when no connector is available.
 */
export const resolveServices = async ({
  agentId,
  connectorId,
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
  const agentRegistry = await agentService.getRegistry({ request });
  const { inference_feature_id: agentInferenceFeatureId } = await getAgentConfiguration({
    agentRegistry,
    agentId,
  });
  const inferenceFeatureId = connectorId === undefined ? agentInferenceFeatureId : undefined;

  const { connectorId: selectedConnectorId, source } = await resolveExecutionConnectorId({
    connectorId,
    inferenceFeatureId,
    request,
    searchInferenceEndpoints,
  });

  if (inferenceFeatureId !== undefined && source === 'default') {
    logger.warn(
      `No model available for inference feature "${inferenceFeatureId}" declared by agent "${agentId}", falling back to the default model`
    );
  }

  if (!selectedConnectorId) {
    throw new Error('No connector available for chat execution');
  }

  const modelProvider = createModelProvider({
    inference,
    request,
    defaultConnectorId: selectedConnectorId,
    telemetryMetadata,
    logger,
    searchInferenceEndpoints,
    spaces,
    security,
    elasticsearch,
  });

  return {
    modelProvider,
    selectedConnectorId,
  };
};
