/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { identifyInfrastructureFeatures, identifySystemFeatures } from '@kbn/streams-ai';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { Feature, Streams, SystemFeature } from '@kbn/streams-schema';

export async function runFeatureIdentification({
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
  features: SystemFeature[];
  signal: AbortSignal;
}): Promise<{ features: Omit<Feature, 'description'>[] }> {
  const { features: systemFeatures } = await identifySystemFeatures({
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

  const { features: infrastructureFeatures } = await identifyInfrastructureFeatures({
    stream,
    start,
    end,
    esClient,
    inferenceClient,
    signal,
    dropUnmapped: false,
  });

  return {
    features: [...systemFeatures, ...infrastructureFeatures],
  };
}
