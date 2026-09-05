/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INFERRED_FEATURE_TYPES,
  MAX_ID_LENGTH,
  MAX_TEXT_LENGTH,
} from '@kbn/significant-events-schema';
import type { SimilarFeatureHit } from '@kbn/streams-ai';
import { z } from '@kbn/zod/v4';
import type { KnowledgeIndicatorClient } from '../../knowledge_indicators';

export const MAX_SEARCH_CANDIDATES = 50;

export const FEATURE_SIMILARITY_TOOL_DESCRIPTION =
  'Search known feature Knowledge Indicators by meaning for one or more candidate features. ' +
  'Pass every candidate absent from known_feature_ids in the candidates array; results are ' +
  'grouped by candidate_id, each with at most five same-type matches in semantic relevance order.';

export const featureCandidateSchema = z.object({
  candidate_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .describe('Stable ID intended for the candidate feature.'),
  title: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature title.'),
  description: z.string().max(MAX_TEXT_LENGTH).describe('Candidate feature description.'),
  type: z.enum(INFERRED_FEATURE_TYPES).describe('Candidate feature type.'),
});

export type FeatureCandidate = z.infer<typeof featureCandidateSchema>;

export interface FeatureSimilarityGroup {
  candidate_id: string;
  features: SimilarFeatureHit[];
  error?: string;
}

export const findSimilarFeatures = async ({
  kiClient,
  streamName,
  args,
}: {
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeatures'>;
  streamName: string;
  args: FeatureCandidate;
}): Promise<SimilarFeatureHit[]> => {
  // Fetch wide then filter: a 5-hit window shared across types can crowd out same-type hits.
  const { hits } = await kiClient.findFeatures(
    streamName,
    `${args.candidate_id} ${args.title} ${args.description}`.trim(),
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

export const searchFeaturesForCandidates = async ({
  kiClient,
  streamName,
  candidates,
}: {
  kiClient: Pick<KnowledgeIndicatorClient, 'findFeatures'>;
  streamName: string;
  candidates: FeatureCandidate[];
}): Promise<FeatureSimilarityGroup[]> =>
  Promise.all(
    candidates.map(async (candidate) => {
      try {
        const features = await findSimilarFeatures({ kiClient, streamName, args: candidate });
        return { candidate_id: candidate.candidate_id, features };
      } catch (error) {
        return {
          candidate_id: candidate.candidate_id,
          features: [],
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );
