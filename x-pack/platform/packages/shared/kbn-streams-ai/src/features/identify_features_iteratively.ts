/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, uniq } from 'lodash';
import type { Logger } from '@kbn/core/server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { BoundInferenceClient, ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature } from '@kbn/streams-schema';
import { isDuplicateFeature } from '@kbn/streams-schema';
import { identifyFeatures } from './identify_features';
import { sumTokens } from '../helpers/sum_tokens';

const DEFAULT_MAX_ITERATIONS = 5;
const DOCUMENTS_BATCH_SIZE = 20;
const MAX_PREVIOUSLY_IDENTIFIED_FEATURES = 100;

const mergeArrays = (a: string[] = [], b: string[] = []) => uniq([...a, ...b]);

function mergeFeature(existing: BaseFeature, incoming: BaseFeature): BaseFeature {
  const mergedEvidence = mergeArrays(existing.evidence, incoming.evidence);
  const mergedEvidenceDocIds = mergeArrays(existing.evidence_doc_ids, incoming.evidence_doc_ids);
  const mergedTags = mergeArrays(existing.tags, incoming.tags);
  const mergedMeta = { ...(existing.meta ?? {}), ...(incoming.meta ?? {}) };
  const mergedProperties = { ...(existing.properties ?? {}), ...(incoming.properties ?? {}) };
  const confidence = Math.round((existing.confidence + incoming.confidence) / 2);
  const filter = incoming.filter ?? existing.filter;

  const mergedFeature = {
    id: existing.id,
    stream_name: existing.stream_name,
    type: existing.type,
    subtype: existing.subtype,
    title: incoming.title,
    description: incoming.description,
    properties: mergedProperties,
    confidence,
    evidence: mergedEvidence.length > 0 ? mergedEvidence : undefined,
    evidence_doc_ids: mergedEvidenceDocIds.length > 0 ? mergedEvidenceDocIds : undefined,
    tags: mergedTags.length > 0 ? mergedTags : undefined,
    filter,
    meta: mergedMeta,
  };

  return mergedFeature;
}

export interface IterationTelemetry {
  iteration: number;
  docsCount: number;
  featuresNew: number;
  featuresUpdated: number;
  durationMs: number;
  tokensUsed: ChatCompletionTokenCount;
}

export interface IdentifyFeaturesIterativelyOptions {
  streamName: string;
  sampleDocuments: Array<SearchHit<Record<string, unknown>>>;
  inferenceClient: BoundInferenceClient;
  systemPrompt: string;
  logger: Logger;
  signal: AbortSignal;
  maxIterations?: number;
  onIterationComplete?: (telemetry: IterationTelemetry) => void;
}

export async function identifyFeaturesIteratively({
  streamName,
  sampleDocuments,
  inferenceClient,
  systemPrompt,
  logger,
  signal,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  onIterationComplete,
}: IdentifyFeaturesIterativelyOptions): Promise<{
  features: BaseFeature[];
  tokensUsed: ChatCompletionTokenCount;
  iterationTelemetry: IterationTelemetry[];
}> {
  const batches = chunk(sampleDocuments, DOCUMENTS_BATCH_SIZE);
  const effectiveMaxIterations = Math.min(maxIterations, batches.length);

  const featuresMap = new Map<string, BaseFeature>();
  const iterationTelemetry: IterationTelemetry[] = [];
  let totalTokensUsed: ChatCompletionTokenCount = {
    prompt: 0,
    completion: 0,
    total: 0,
    cached: 0,
  };

  for (let i = 0; i < effectiveMaxIterations; i++) {
    if (signal.aborted) {
      logger.debug('Iterative feature identification aborted');
      break;
    }

    const batch = batches[i];
    const previousFeatures = Array.from(featuresMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_PREVIOUSLY_IDENTIFIED_FEATURES);

    logger.debug(
      `Iteration ${i + 1}/${effectiveMaxIterations}: processing ${batch.length} documents, ${
        featuresMap.size
      } features accumulated so far`
    );

    const iterationStart = Date.now();
    const { features: iterationFeatures, tokensUsed } = await identifyFeatures({
      streamName,
      sampleDocuments: batch,
      inferenceClient,
      systemPrompt,
      logger,
      signal,
      previouslyIdentifiedFeatures: previousFeatures.map((f) => ({
        id: f.id,
        type: f.type,
        subtype: f.subtype,
        properties: f.properties,
      })),
    });

    totalTokensUsed = sumTokens(totalTokensUsed, tokensUsed);

    let newFeatureCount = 0;
    let updatedFeatureCount = 0;
    for (const feature of iterationFeatures) {
      const duplicateEntry = Array.from(featuresMap.entries()).find(([, existing]) =>
        isDuplicateFeature(existing, feature)
      );
      if (duplicateEntry) {
        const [duplicateId, duplicateFeature] = duplicateEntry;
        updatedFeatureCount++;
        featuresMap.set(duplicateId, mergeFeature(duplicateFeature, feature));
      } else {
        newFeatureCount++;
        featuresMap.set(feature.id, feature);
      }
    }

    const iterationEntry: IterationTelemetry = {
      iteration: i + 1,
      docsCount: batch.length,
      featuresNew: newFeatureCount,
      featuresUpdated: updatedFeatureCount,
      durationMs: Date.now() - iterationStart,
      tokensUsed,
    };
    iterationTelemetry.push(iterationEntry);
    onIterationComplete?.(iterationEntry);

    const cachedTokens = tokensUsed.cached ?? 0;
    logger.debug(
      `Iteration ${i + 1}: found ${iterationFeatures.length} features ` +
        `(${newFeatureCount} new, ${updatedFeatureCount} updated), ${featuresMap.size} total accumulated, ` +
        `tokens: prompt=${tokensUsed.prompt} completion=${tokensUsed.completion} cached=${cachedTokens}`
    );

    if (newFeatureCount === 0) {
      logger.debug(`Stopping: no new features found`);
      break;
    }
  }

  return {
    features: Array.from(featuresMap.values()),
    tokensUsed: totalTokensUsed,
    iterationTelemetry,
  };
}
