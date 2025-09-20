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
import moment from 'moment';
import { generateSignificantEvents } from '@kbn/streams-ai';

const DEFAULT_SHORT_LOOKBACK = moment.duration(24, 'hours');

interface Params {
  definition: Streams.all.Definition;
  connectorId: string;
  currentDate?: Date;
  shortLookback?: moment.Duration;
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
  const { definition, connectorId, shortLookback, currentDate = new Date(), system } = params;
  const { inferenceClient, esClient, logger } = dependencies;

  const mend = moment(currentDate);
  const mstart = mend.clone().subtract(shortLookback ?? DEFAULT_SHORT_LOOKBACK);

  const start = mstart.valueOf();
  const end = mend.valueOf();

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
