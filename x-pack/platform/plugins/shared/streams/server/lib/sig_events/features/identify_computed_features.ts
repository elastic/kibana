/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { Feature, Streams } from '@kbn/streams-schema';
import { generateAllComputedFeatures } from '@kbn/streams-ai';
import type { FeatureClient } from '../../streams/feature/feature_client';
import { reconcileComputedFeatures } from './reconcile_features';

export interface IdentifyComputedFeaturesOptions {
  stream: Streams.all.Definition;
  streamName: string;
  start: number;
  end: number;
  esClient: ElasticsearchClient;
  featureClient: FeatureClient;
  logger: Logger;
  featureTtlDays?: number;
}

export async function identifyComputedFeatures({
  stream,
  streamName,
  start,
  end,
  esClient,
  featureClient,
  logger,
  featureTtlDays,
}: IdentifyComputedFeaturesOptions): Promise<Feature[]> {
  const computedFeatures = await generateAllComputedFeatures({
    stream,
    start,
    end,
    esClient,
    logger: logger.get('computed_features'),
  });

  const reconciledComputedFeatures = reconcileComputedFeatures({
    computedFeatures,
    streamName,
    featureTtlDays,
  });

  if (reconciledComputedFeatures.length > 0) {
    await featureClient.bulk(
      streamName,
      reconciledComputedFeatures.map((feature) => ({ index: { feature } }))
    );
  }

  return reconciledComputedFeatures;
}
