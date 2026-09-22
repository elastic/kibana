/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type {
  BoundInferenceClient,
  ChatCompletionTokenCount,
  ToolCallback,
  ToolDefinition,
} from '@kbn/inference-common';
import {
  type BaseFeature,
  type IgnoredFeature,
  identifiedFeatureSchema,
  ignoredFeatureSchema,
} from '@kbn/significant-events-schema';
import { withSpan } from '@kbn/apm-utils';
import { executeAsReasoningAgent } from '@kbn/inference-prompt-utils';
import { conditionSchema, isConditionComplete, type Condition } from '@kbn/streamlang';
import type { AnalysisTarget } from '../../shared/analysis_target';
import { createIdentifyFeaturesPrompt } from './prompt';
import type { InferenceDocument } from './utils/format_raw_document';
import { sumTokens } from '../../shared/tokens/sum_tokens';

/**
 * Mirrors the "2–5 evidence strings" guidance in the system prompt. Capping here rather than
 * with `maxItems` in the finalize schema keeps an over-long array from failing tool-call
 * validation, which would retry the whole generation and then drop the batch.
 */
const MAX_EVIDENCE_ITEMS = 5;
export const MAX_IDENTIFIED_FEATURES_PER_ITERATION = 100;

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
  target: AnalysisTarget;
  sampleDocuments: InferenceDocument[];
  excludedFeatures?: ExcludedFeatureSummary[];
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  knownFeatureIds?: string;
  additionalTools?: Record<string, ToolDefinition>;
  additionalToolCallbacks?: Record<string, ToolCallback>;
}

export async function identifyFeatures({
  target,
  sampleDocuments,
  excludedFeatures,
  systemPrompt,
  inferenceClient,
  logger,
  signal,
  previouslyIdentifiedFeatures = [],
  knownFeatureIds = '',
  additionalTools,
  additionalToolCallbacks,
}: IdentifyFeaturesOptions): Promise<{
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}> {
  const previousFeaturesContext =
    previouslyIdentifiedFeatures.length > 0 ? JSON.stringify(previouslyIdentifiedFeatures) : '';

  const response = await withSpan('invoke_prompt', () =>
    executeAsReasoningAgent({
      input: {
        sample_documents: JSON.stringify(sampleDocuments),
        previously_identified_features: previousFeaturesContext,
        known_feature_ids: knownFeatureIds,
        excluded_features: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : '',
      },
      prompt: createIdentifyFeaturesPrompt({ systemPrompt, additionalTools }),
      inferenceClient,
      maxSteps: additionalToolCallbacks ? 6 : 4,
      toolCallbacks: {
        ...(additionalToolCallbacks ?? {}),
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
        stream_name: target.id,
        filter: tryParseFilter(feature.filter),
        ...(Array.isArray(feature.evidence)
          ? { evidence: feature.evidence.slice(0, MAX_EVIDENCE_ITEMS) }
          : {}),
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
    features: uniqBy(finalizedFeatures, (feature) => feature.id).slice(
      0,
      MAX_IDENTIFIED_FEATURES_PER_ITERATION
    ),
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
