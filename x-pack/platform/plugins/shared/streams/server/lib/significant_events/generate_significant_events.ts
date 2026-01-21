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
  esClient: ElasticsearchClient;
  logger: Logger;
  signal: AbortSignal;
}

export async function generateSignificantEventDefinitions(
  params: Params,
  dependencies: Dependencies
): Promise<{ queries: GeneratedSignificantEventQuery[]; tokensUsed: ChatCompletionTokenCount }> {
  const { definition, connectorId, start, end, system, sampleDocsSize, systemPrompt } = params;
  const { inferenceClient, esClient, logger, signal } = dependencies;

  const boundInferenceClient = inferenceClient.bindTo({
    connectorId,
  });

  const { queries, tokensUsed } = await generateSignificantEvents({
    stream: definition,
    start,
    end,
    esClient,
    inferenceClient: boundInferenceClient,
    logger,
    system,
    signal,
    sampleDocsSize,
    systemPrompt,
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
  };
}
