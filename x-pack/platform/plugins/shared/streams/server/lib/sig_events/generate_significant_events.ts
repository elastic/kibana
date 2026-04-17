/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, InferenceClient } from '@kbn/inference-common';
import type { GeneratedSignificantEventQuery, Streams } from '@kbn/streams-schema';
import { QUERY_TYPE_STATS, ensureMetadata } from '@kbn/streams-schema';
import { generateSignificantEvents } from '@kbn/streams-ai';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { FeatureClient } from '../streams/feature/feature_client';
import type { MemoryDiscoveryTools } from './memory_discovery_tools';

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  systemPrompt: string;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  featureClient: FeatureClient;
  logger: Logger;
  signal: AbortSignal;
  esClient: ElasticsearchClient;
  memoryTools?: MemoryDiscoveryTools;
}

export async function generateSignificantEventDefinitions(
  params: Params,
  dependencies: Dependencies
): Promise<{
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}> {
  const { definition, connectorId, systemPrompt } = params;
  const { inferenceClient, featureClient, logger, signal, esClient, memoryTools } = dependencies;

  const boundInferenceClient = inferenceClient.bindTo({
    connectorId,
  });

  const { queries, tokensUsed, toolUsage } = await generateSignificantEvents({
    stream: definition,
    esClient,
    inferenceClient: boundInferenceClient,
    logger,
    signal,
    systemPrompt: memoryTools ? `${systemPrompt}\n${memoryTools.promptSnippet}` : systemPrompt,
    // Server owns data access; AI layer only requests context via this callback.
    getFeatures: async (filters) => {
      const response = await featureClient.getFeatures(definition.name, filters);
      return response.hits;
    },
    additionalTools: memoryTools?.tools,
    additionalToolCallbacks: memoryTools?.callbacks,
  });

  return {
    queries: queries.map((query) => ({
      type: query.type,
      title: query.title,
      description: query.description,
      esql: {
        query: query.type === QUERY_TYPE_STATS ? query.esql : ensureMetadata(query.esql),
      },
      severity_score: query.severity_score,
      evidence: query.evidence,
    })),
    tokensUsed,
    toolUsage,
  };
}
