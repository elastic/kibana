/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, uniqBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  type BaseFeature,
  type IgnoredFeature,
  identifiedFeatureSchema,
  ignoredFeatureSchema,
} from '@kbn/significant-events-schema';
import { withSpan } from '@kbn/apm-utils';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { conditionSchema, isConditionComplete, type Condition } from '@kbn/streamlang';
import { createIdentifyFeaturesPrompt } from './prompt';
import { formatRawDocument } from './utils/format_raw_document';
import { sumTokens } from '../helpers/sum_tokens';

export interface PreviouslyIdentifiedFeature {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description?: string;
  properties: Record<string, unknown>;
}

export const toPreviouslyIdentifiedFeature = (
  feature: BaseFeature
): PreviouslyIdentifiedFeature => ({
  id: feature.id,
  type: feature.type,
  subtype: feature.subtype,
  title: feature.title,
  description: feature.description,
  properties: feature.properties,
});
export type { IgnoredFeature } from '@kbn/significant-events-schema';

export interface ExcludedFeatureSummary {
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description?: string;
  properties: Record<string, unknown>;
}

export interface SearchSimilarFeaturesArguments {
  candidate_id: string;
  title: string;
  description: string;
  type: string;
}

export interface SimilarFeatureHit {
  id: string;
  title: string;
  description: string;
  confidence: number;
}

export interface IdentifyFeaturesOptions {
  streamName: string;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
  excludedFeatures?: ExcludedFeatureSummary[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  knownFeatureIds?: string;
  searchSimilarFeatures?: (args: SearchSimilarFeaturesArguments) => Promise<SimilarFeatureHit[]>;
}

export async function identifyFeatures({
  streamName,
  sampleDocuments,
  excludedFeatures,
  systemPrompt,
  inferenceClient,
  logger,
  signal,
  previouslyIdentifiedFeatures = [],
  knownFeatureIds = '',
  searchSimilarFeatures,
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const formattedDocuments = compact(
    sampleDocuments.map((hit) =>
      formatRawDocument({
        hit,
        shouldNotTruncate(key: string) {
          return key.includes('tags');
        },
      })
    )
  );

  const previousFeaturesContext =
    previouslyIdentifiedFeatures.length > 0 ? JSON.stringify(previouslyIdentifiedFeatures) : '';

  const response = await withSpan('invoke_prompt', () =>
    executeAsReasoningAgent({
      input: {
        sample_documents: JSON.stringify(formattedDocuments),
        previously_identified_features: previousFeaturesContext,
        known_feature_ids: knownFeatureIds,
        excluded_features: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : '',
      },
      prompt: createIdentifyFeaturesPrompt({ systemPrompt }),
      inferenceClient,
      maxSteps: 4,
      toolCallbacks: {
        search_similar_features: async (toolCall) => {
          if (!searchSimilarFeatures) {
            return {
              response: {
                features: [],
                count: 0,
                error: 'Semantic feature search is unavailable.',
              },
            };
          }

          try {
            const features = await searchSimilarFeatures(toolCall.function.arguments);
            return {
              response: {
                features,
                count: features.length,
              },
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn(`Failed to search similar features: ${errorMessage}`);
            return {
              response: {
                features: [],
                count: 0,
                error: errorMessage,
              },
            };
          }
        },
        finalize_features: async () => ({ response: { finalized: true } }),
      },
      finalToolChoice: {
        type: 'function',
        function: 'finalize_features',
      },
      abortSignal: signal,
    })
  );

  if (response.toolCalls.length === 0) {
    throw new Error('Feature identification did not call finalize_features');
  }

  const finalizedFeatures: BaseFeature[] = [];
  const ignoredFeatures: IgnoredFeature[] = [];
  for (const toolCall of response.toolCalls) {
    const { features, ignored_features: ignored = [] } = toolCall.function.arguments;
    if (!Array.isArray(features)) {
      throw new Error('Feature identification returned invalid finalize_features output');
    }

    for (const feature of features) {
      const candidate = {
        ...feature,
        stream_name: streamName,
        filter: tryParseFilter(feature.filter),
      };
      const result = identifiedFeatureSchema.safeParse(candidate);
      if (!result.success || Object.keys(result.data.properties).length === 0) {
        continue;
      }
      finalizedFeatures.push(result.data);
    }

    for (const item of Array.isArray(ignored) ? ignored : []) {
      const result = ignoredFeatureSchema.safeParse(item);
      if (result.success) {
        ignoredFeatures.push(result.data);
      }
    }
  }

  return {
    features: uniqBy(finalizedFeatures, (feature) => feature.id),
    ignoredFeatures,
    tokensUsed: sumTokens({ added: response.tokens }),
  };
}

function tryParseFilter(maybeFilter: unknown): Condition | undefined {
  if (!maybeFilter) {
    return undefined;
  }

  const result = conditionSchema.safeParse(maybeFilter);
  if (!result.success) {
    return undefined;
  }

  return isConditionComplete(result.data) ? result.data : undefined;
}
