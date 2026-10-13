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
import { createAgentNotFoundError, isAgentNotFoundError } from '@kbn/agent-builder-common';
import type { AgentRegistry, AgentsServiceStart } from '../../agents';
import { createModelProvider } from '../runner/model_provider';
import { resolveExecutionConnectorId } from './resolve_execution_connector_id';

const getAgentInferenceFeatureId = async ({
  agentRegistry,
  agentId,
  connectorId,
}: {
  agentRegistry: AgentRegistry;
  agentId: string;
  connectorId?: string;
}): Promise<string | undefined> => {
  const notFoundError = () =>
    createAgentNotFoundError({
      agentId,
      customMessage: `Agent "${agentId}" not found or not available`,
    });

  if (connectorId !== undefined) {
    if (!(await agentRegistry.has(agentId))) {
      throw notFoundError();
    }
    return undefined;
  }

  try {
    const agent = await agentRegistry.get(agentId);
    return agent.configuration.inference_feature_id;
  } catch (error) {
    throw isAgentNotFoundError(error) ? notFoundError() : error;
  }
};

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
}) => {
  const agentRegistry = await agentService.getRegistry({ request });
  const inferenceFeatureId = await getAgentInferenceFeatureId({
    agentRegistry,
    agentId,
    connectorId,
  });

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
