/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { InferenceClient } from '@kbn/inference-common';

export async function generateContentPack({
  stream,
  esClient,
  inferenceClient,
  logger,
  start,
  end,
  signal,
}: {
  stream: Streams.all.Definition;
  esClient: ElasticsearchClient;
  inferenceClient: InferenceClient;
  logger: Logger;
  start: number;
  end: number;
  signal: AbortSignal;
}) {}
