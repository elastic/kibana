/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { getStreamTypeFromDefinition } from '@kbn/streams-schema';
import {
  SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
  type SignificantEventsQueriesGenerationResult,
} from '@kbn/significant-events-schema';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import type { StreamsClient } from '@kbn/streams-plugin/server';
import type { EbtTelemetryClient } from '../telemetry/ebt';
import { resolveConnectorForFeature } from '../../routes/utils/resolve_connector_for_feature';
import { executeKIQueryGenerationAgent } from './identify_ki_queries_via_agent';

export interface GenerateKIQueriesParams {
  streamName: string;
  connectorId?: string;
}

export interface GenerateKIQueriesDependencies {
  streamsClient: StreamsClient;
  agentBuilder: AgentBuilderPluginStart;
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  request: KibanaRequest;
  logger: Logger;
  signal: AbortSignal;
  telemetry: EbtTelemetryClient;
}

export async function generateKIQueries(
  params: GenerateKIQueriesParams,
  deps: GenerateKIQueriesDependencies
): Promise<SignificantEventsQueriesGenerationResult & { connectorId: string }> {
  const { streamName, connectorId: connectorIdOverride } = params;
  const {
    streamsClient,
    agentBuilder,
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
      featureId: SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID,
      featureName: 'query generation',
      request,
    }));

  logger.debug(`Using connector ${connectorId} for query generation`);

  const definition = await streamsClient.getStream(streamName);

  const startedAt = Date.now();
  const { queries, tokensUsed } = await executeKIQueryGenerationAgent({
    agentBuilder,
    request,
    connectorId,
    definition,
    signal,
    logger: logger.get('significant_events_queries_generation'),
  });
  const durationMs = Date.now() - startedAt;

  telemetry.trackSignificantEventsQueriesGenerated({
    count: queries.length,
    connector_id: connectorId,
    stream_name: definition.name,
    stream_type: getStreamTypeFromDefinition(definition),
    input_tokens_used: tokensUsed.prompt,
    output_tokens_used: tokensUsed.completion,
    cached_tokens_used: tokensUsed.cached ?? 0,
    duration_ms: durationMs,
  });

  return { queries, tokensUsed, connectorId };
}
