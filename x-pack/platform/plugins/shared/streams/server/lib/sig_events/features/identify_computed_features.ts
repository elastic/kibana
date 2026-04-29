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
import { isNotFoundError } from '@kbn/es-errors';
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
  runId: string;
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
  runId,
}: IdentifyComputedFeaturesOptions): Promise<Feature[]> {
  let computedFeatures;
  try {
    computedFeatures = await generateAllComputedFeatures({
      stream,
      start,
      end,
      esClient,
      logger: logger.get('computed_features'),
    });
  } catch (err) {
    // A stream can exist without a materialized backing data stream yet
    // (e.g. a wired root stream before any data has been onboarded). That's
    // a normal state, not a failure — there's simply nothing to analyze.
    if (isNotFoundError(err)) {
      logger.debug(
        () =>
          `Skipping computed features for ${streamName}: backing data stream not materialized yet`
      );
      return [];
    }
    throw err;
  }

  const reconciledComputedFeatures = reconcileComputedFeatures({
    computedFeatures,
    streamName,
    featureTtlDays,
    runId,
  });

  if (reconciledComputedFeatures.length > 0) {
    await featureClient.bulk(
      streamName,
      reconciledComputedFeatures.map((feature) => ({ index: { feature } }))
    );
  }

  return reconciledComputedFeatures;
}
