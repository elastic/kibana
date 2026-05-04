/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InferenceClient } from '@kbn/inference-common';
import {
  getStreamTypeFromDefinition,
  STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_MEMORY } from '@kbn/management-settings-ids';
import { isInferenceProviderError } from '@kbn/inference-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { StreamsClient } from '../streams/client';
import type { FeatureClient } from '../streams/feature/feature_client';
import type { QueryClient } from '../streams/assets/query/query_client';
import type { EbtTelemetryClient } from '../telemetry';
import { resolveConnectorForFeature } from '../../routes/utils/resolve_connector_for_feature';
import { formatInferenceProviderError } from '../../routes/utils/create_connector_sse_error';
import { PromptsConfigService } from './saved_objects/prompts_config_service';
import { generateSignificantEventDefinitions } from './generate_significant_events';
import { MemoryServiceImpl } from '../memory';
import { createMemoryDiscoveryTools } from './memory_discovery_tools';

export interface GenerateKIQueriesParams {
  streamName: string;
  connectorId?: string;
  maxExistingQueriesForContext?: number;
}

export interface GenerateKIQueriesDependencies {
  streamsClient: StreamsClient;
  inferenceClient: InferenceClient;
  soClient: SavedObjectsClientContract;
  featureClient: FeatureClient;
  queryClient: QueryClient;
  esClient: ElasticsearchClient;
  uiSettingsClient: IUiSettingsClient;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  request: KibanaRequest;
  logger: Logger;
  signal: AbortSignal;
  telemetry: EbtTelemetryClient;
}

export async function generateKIQueries(
  params: GenerateKIQueriesParams,
  deps: GenerateKIQueriesDependencies
): Promise<
  SignificantEventsQueriesGenerationResult & {
    toolUsage: SignificantEventsToolUsage;
    connectorId: string;
  }
> {
  const { streamName, connectorId: connectorIdOverride, maxExistingQueriesForContext } = params;
  const {
    streamsClient,
    inferenceClient,
    soClient,
    featureClient,
    queryClient,
    esClient,
    uiSettingsClient,
    searchInferenceEndpoints,
    request,
    logger,
    signal,
    telemetry,
  } = deps;

  const connectorId =
    connectorIdOverride ??
    (await resolveConnectorForFeature({
      searchInferenceEndpoints,
      featureId: STREAMS_SIG_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
      featureName: 'query generation',
      request,
    }));

  logger.debug(`Using connector ${connectorId} for query generation`);

  const [definition, { significantEventsPromptOverride }, useMemory] = await Promise.all([
    streamsClient.getStream(streamName),
    new PromptsConfigService({ soClient, logger }).getPrompt(),
    uiSettingsClient.get<boolean>(OBSERVABILITY_STREAMS_ENABLE_MEMORY),
  ]);

  const memoryTools = useMemory
    ? createMemoryDiscoveryTools({
        memoryService: new MemoryServiceImpl({
          logger: logger.get('memory'),
          esClient,
        }),
      })
    : undefined;

  const result = await generateSignificantEventDefinitions(
    {
      definition,
      connectorId,
      systemPrompt: significantEventsPromptOverride,
      maxExistingQueriesForContext,
    },
    {
      inferenceClient,
      esClient,
      featureClient,
      queryClient,
      logger: logger.get('significant_events_generation'),
      signal,
      memoryTools,
    }
  ).catch(async (error) => {
    if (isInferenceProviderError(error)) {
      const connector = await inferenceClient.getConnectorById(connectorId).catch(() => undefined);
      if (connector) {
        throw new Error(formatInferenceProviderError(error, connector), { cause: error });
      }
    }
    throw error;
  });

  telemetry.trackSignificantEventsQueriesGenerated({
    count: result.queries.length,
    stream_name: definition.name,
    stream_type: getStreamTypeFromDefinition(definition),
    input_tokens_used: result.tokensUsed.prompt,
    output_tokens_used: result.tokensUsed.completion,
    tool_usage: result.toolUsage,
  });

  return { ...result, connectorId };
}
