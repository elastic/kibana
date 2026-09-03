/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchSimilarFeaturesArguments, SimilarFeatureHit } from '@kbn/streams-ai';
import { z } from '@kbn/zod/v4';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';

export const featureSimilaritySearchResultSchema = z.object({
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      confidence: z.number(),
    })
  ),
  count: z.number().int().min(0),
});

export type FeatureSimilaritySearchResult = z.infer<typeof featureSimilaritySearchResultSchema>;

export const findSimilarFeatures = async ({
  kiClient,
  streamName,
  args,
}: {
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeatures'>;
  streamName: string;
  args: SearchSimilarFeaturesArguments;
}): Promise<SimilarFeatureHit[]> => {
  // Fetch wide then filter: a 5-hit window shared across types can crowd out same-type hits.
  const { hits } = await kiClient.findFeatures(
    streamName,
    `${args.title} ${args.description}`.trim(),
    {
      searchMode: 'semantic',
      limit: 20,
    }
  );

  return hits
    .filter((feature) => feature.type === args.type)
    .slice(0, 5)
    .map((feature) => ({
      id: feature.id,
      title: feature.title ?? feature.id,
      description: feature.description,
      confidence: feature.confidence,
    }));
};

export const searchFeatureSimilarity = async (
  options: Parameters<typeof findSimilarFeatures>[0]
): Promise<FeatureSimilaritySearchResult> => {
  const features = await findSimilarFeatures(options);
  return { features, count: features.length };
};
