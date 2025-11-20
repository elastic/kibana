/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyFeatures } from '@kbn/streams-ai';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Streams, Feature } from '@kbn/streams-schema';

export function runFeatureIdentification({
  start,
  end,
  esClient,
  inferenceClient,
  logger,
  stream,
  features,
  signal,
}: {
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
  logger: Logger;
  stream: Streams.all.Definition;
  features: Feature[];
  signal: AbortSignal;
}) {
  return identifyFeatures({
    start,
    end,
    esClient,
    inferenceClient,
    logger,
    stream,
    features,
    signal,
    dropUnmapped: true,
  });
}
