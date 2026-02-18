/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ChatCompletionTokenCount, InferenceClient } from '@kbn/inference-common';
import type { GeneratedSignificantEventQuery, Streams, System } from '@kbn/streams-schema';
import { generateSignificantEvents } from '@kbn/streams-ai';
import type { SignificantEventsToolUsage } from '@kbn/streams-ai';
import type { FeatureClient } from '../streams/feature/feature_client';

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  start: number;
  end: number;
  system?: System;
  sampleDocsSize?: number;
  systemPrompt: string;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  featureClient: FeatureClient;
  logger: Logger;
  signal: AbortSignal;
  esClient: ElasticsearchClient;
}

export async function generateSignificantEventDefinitions(
  params: Params,
  dependencies: Dependencies
): Promise<{
  queries: GeneratedSignificantEventQuery[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}> {
  const { definition, connectorId, start, end, system, sampleDocsSize, systemPrompt } = params;
  const { inferenceClient, featureClient, logger, signal, esClient } = dependencies;

  const boundInferenceClient = inferenceClient.bindTo({
    connectorId,
  });

  const { queries, tokensUsed, toolUsage } = await generateSignificantEvents({
    stream: definition,
    esClient,
    start,
    end,
    inferenceClient: boundInferenceClient,
    logger,
    system,
    signal,
    sampleDocsSize,
    systemPrompt,
    // Server owns data access; AI layer only requests context via this callback.
    getFeatures: async (filters) => {
      const response = await featureClient.getFeatures(definition.name, filters);
      return response.hits;
    },
  });

  return {
    queries: queries.map((query) => ({
      title: query.title,
      kql: query.kql,
      feature: system ? { name: system.name, filter: system.filter, type: system.type } : undefined,
      severity_score: query.severity_score,
      evidence: query.evidence,
    })),
    tokensUsed,
    toolUsage,
  };
}
