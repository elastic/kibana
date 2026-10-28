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
import type {
  ChatCompletionReasoningEffort,
  ConnectorTelemetryMetadata,
  InferenceConnector,
} from '@kbn/inference-common';
import { getSupportedReasoningEffortLevels } from '@kbn/inference-common';
import type { AgentConfiguration } from '@kbn/agent-builder-common';
import { createAgentNotFoundError, isAgentNotFoundError } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AgentRegistry, AgentsServiceStart } from '../../agents';
import { createModelProvider } from '../runner/model_provider';
import { resolveExecutionConnectorId } from './resolve_execution_connector_id';

export interface ResolvedServices {
  modelProvider: ModelProvider;
  selectedConnectorId: string;
  reasoningLevel?: ChatCompletionReasoningEffort;
}

const getAgentConfiguration = async ({
  agentRegistry,
  agentId,
  runAs,
}: {
  agentRegistry: AgentRegistry;
  agentId: string;
  runAs?: string;
}): Promise<AgentConfiguration> => {
  try {
    const { configuration } =
      runAs !== undefined
        ? await agentRegistry.get(agentId, { runAs })
        : await agentRegistry.get(agentId);
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

const resolveAgentReasoningLevel = async ({
  agentId,
  reasoningLevel,
  connectorId,
  connector,
  request,
  inference,
  logger,
}: {
  agentId: string;
  reasoningLevel?: ChatCompletionReasoningEffort;
  connectorId: string;
  connector?: InferenceConnector;
  request: KibanaRequest;
  inference: InferenceServerStart;
  logger: Logger;
}): Promise<ChatCompletionReasoningEffort | undefined> => {
  if (reasoningLevel === undefined) {
    return undefined;
  }

  // Resolution failures are left to the runner, which records them against the execution.
  const resolvedConnector =
    connector ?? (await inference.getConnectorById(connectorId, request).catch(() => undefined));
  const supportedLevels = resolvedConnector
    ? getSupportedReasoningEffortLevels(resolvedConnector)
    : undefined;

  if (supportedLevels === undefined || supportedLevels.includes(reasoningLevel)) {
    return reasoningLevel;
  }

  logger.warn(
    `Reasoning level "${reasoningLevel}" declared by agent "${agentId}" is not supported by model "${
      resolvedConnector?.name
    }" (${connectorId}), running without a reasoning level. Supported levels: ${supportedLevels.join(
      ', '
    )}.`
  );
  return undefined;
};

/**
 * Resolves the model provider an agent execution runs with.
 *
 * @param connectorId - Connector requested by the caller. When set, the agent's inference feature
 * is ignored.
 * @param reasoningLevel - Reasoning level requested by the caller. When set, it overrides the
 * agent's default `reasoning_level`.
 * @param runAs - Service account the execution runs as; see `GetAgentOptions.runAs`.
 * @returns The model provider, the selected connector and the reasoning level the run uses.
 * @throws {AgentBuilderError} with code `agentNotFound` when the agent does not exist or the
 * caller cannot access it.
 * @throws {Error} when no connector is available.
 */
export const resolveServices = async ({
  agentId,
  connectorId,
  reasoningLevel,
  telemetryMetadata,
  runAs,
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
  reasoningLevel?: ChatCompletionReasoningEffort;
  telemetryMetadata?: ConnectorTelemetryMetadata;
  runAs?: string;
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
  const { inference_feature_id: agentInferenceFeatureId, reasoning_level: agentReasoningLevel } =
    await getAgentConfiguration({ agentRegistry, agentId, runAs });
  const inferenceFeatureId = connectorId === undefined ? agentInferenceFeatureId : undefined;

  const {
    connectorId: selectedConnectorId,
    connector,
    source,
  } = await resolveExecutionConnectorId({
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

  const resolvedReasoningLevel =
    reasoningLevel ??
    (await resolveAgentReasoningLevel({
      agentId,
      reasoningLevel: agentReasoningLevel,
      connectorId: selectedConnectorId,
      connector,
      request,
      inference,
      logger,
    }));

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
    ...(resolvedReasoningLevel !== undefined ? { reasoningLevel: resolvedReasoningLevel } : {}),
  };
};
