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
import { createAgentNotFoundError } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_INFERENCE_FEATURE_ID } from '@kbn/agent-builder-common/constants';
import type { AgentsServiceStart } from '../../agents';
import { createModelProvider } from '../runner/model_provider';

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
  const selectedConnectorId =
    connectorId ??
    (
      await searchInferenceEndpoints.endpoints.getForFeature(
        AGENT_BUILDER_INFERENCE_FEATURE_ID,
        request
      )
    ).endpoints[0]?.connectorId;

  if (!selectedConnectorId) {
    throw new Error('No connector available for chat execution');
  }

  const hasAgent = await agentService
    .getRegistry({ request })
    .then((agentRegistry) => agentRegistry.has(agentId));

  if (!hasAgent) {
    throw createAgentNotFoundError({
      agentId,
      customMessage: `Agent "${agentId}" not found or not available`,
    });
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
