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
import { type BaseFeature, baseFeatureSchema } from '@kbn/streams-schema';
import { withSpan } from '@kbn/apm-utils';
import { conditionSchema, type Condition } from '@kbn/streamlang';
import { createIdentifyFeaturesPrompt } from './prompt';
import { formatRawDocument } from './utils/format_raw_document';
import { sumTokens } from '../helpers/sum_tokens';

export interface PreviouslyIdentifiedFeature {
  id: string;
  type: string;
  subtype?: string;
  properties: Record<string, unknown>;
}

export interface IdentifyFeaturesOptions {
  streamName: string;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
}

export async function identifyFeatures({
  streamName,
  sampleDocuments,
  systemPrompt,
  inferenceClient,
  logger,
  signal,
  previouslyIdentifiedFeatures = [],
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  logger.debug(`Identifying features from ${sampleDocuments.length} sample documents`);

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
    inferenceClient.prompt({
      input: {
        sample_documents: JSON.stringify(formattedDocuments),
        previously_identified_features: previousFeaturesContext,
      },
      prompt: createIdentifyFeaturesPrompt({ systemPrompt }),
      abortSignal: signal,
    })
  );

  const features = uniqBy(
    response.toolCalls
      .flatMap((toolCall) => toolCall.function.arguments.features)
      .map((feature) => {
        return {
          ...feature,
          stream_name: streamName,
          filter: tryParseFilter(feature.filter),
        };
      })
      .filter((feature) => {
        const result = baseFeatureSchema.safeParse(feature);
        if (!result.success) {
          return false;
        }

        // ensure that the feature has at least one stable identifying property
        return Object.keys(feature.properties).length > 0;
      }),
    (feature) => feature.id
  );

  return {
    features,
    tokensUsed: sumTokens({ prompt: 0, completion: 0, total: 0, cached: 0 }, response.tokens),
  };
}

function tryParseFilter(maybeFilter: unknown): Condition | undefined {
  if (!maybeFilter) {
    return undefined;
  }

  const result = conditionSchema.safeParse(maybeFilter);
  return result.success ? result.data : undefined;
}
