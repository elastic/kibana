/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { type InferenceClient } from '@kbn/inference-common';
import type { System } from '@kbn/streams-schema';
import { type GeneratedSignificantEventQuery, type Streams } from '@kbn/streams-schema';
import { generateSignificantEvents } from '@kbn/streams-ai';

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  start: number;
  end: number;
  system?: System;
}

interface Dependencies {
  inferenceClient: InferenceClient;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export async function generateSignificantEventDefinitions(
  params: Params,
  dependencies: Dependencies
): Promise<GeneratedSignificantEventQuery[]> {
  const { definition, connectorId, start, end, system } = params;
  const { inferenceClient, esClient, logger } = dependencies;

  const boundInferenceClient = inferenceClient.bindTo({
    connectorId,
  });

  const { queries } = await generateSignificantEvents({
    stream: definition,
    start,
    end,
    esClient,
    inferenceClient: boundInferenceClient,
    logger,
    system,
  });

  return queries.map((query) => ({ title: query.title, kql: query.kql }));
}
