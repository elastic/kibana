/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, QueryLink } from '@kbn/streams-schema';
import type {
  KnowledgeIndicator,
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsOutput,
} from './types';
import { featureToKnowledgeIndicatorFeature, queryLinkToKnowledgeIndicatorQuery } from './mappers';

export const DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_LIMIT = 50;

export async function searchKnowledgeIndicators({
  getStreamNames,
  getFeatures,
  getQueries,
  onFeatureFetchError,
  params,
}: {
  getStreamNames(): Promise<string[]>;
  getFeatures(
    streamName: string,
    options: { min_confidence?: number; limit?: number }
  ): Promise<Feature[]>;
  getQueries(streamNames: string[], search_text?: string): Promise<QueryLink[]>;
  /**
   * Optional callback invoked when feature retrieval fails for a stream.
   * This is intentionally side-effecty and internal-only (used for debug/telemetry),
   * and does not change the tool output schema.
   */
  onFeatureFetchError?: (streamName: string, error: unknown) => void;
  params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput> {
  const normalizedSearchText =
    typeof params.search_text === 'string' && params.search_text.trim().length > 0
      ? params.search_text.trim()
      : undefined;

  const normalizedLimit =
    typeof params.limit === 'number' && Number.isFinite(params.limit) && params.limit > 0
      ? Math.floor(params.limit)
      : DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_LIMIT;

  const normalizedMinConfidence =
    typeof params.min_confidence === 'number' &&
    Number.isFinite(params.min_confidence) &&
    params.min_confidence >= 0 &&
    params.min_confidence <= 100
      ? params.min_confidence
      : undefined;

  const kindFilter = Array.isArray(params.kind) && params.kind.length > 0 ? params.kind : undefined;
  const includeFeatures = !kindFilter || kindFilter.includes('feature');
  const includeQueries = !kindFilter || kindFilter.includes('query');

  const accessibleStreamNames = await getStreamNames();
  const accessibleStreamNameSet = new Set(accessibleStreamNames);

  const requestedStreamNames =
    Array.isArray(params.stream_names) && params.stream_names.length > 0
      ? [...new Set(params.stream_names)].filter((name) => accessibleStreamNameSet.has(name))
      : accessibleStreamNames;

  const streamNames = requestedStreamNames.filter(
    (name) => typeof name === 'string' && name.length > 0
  );

  const knowledgeIndicators: KnowledgeIndicator[] = [];

  if (includeFeatures) {
    const perStreamFeatureResults = await Promise.allSettled(
      streamNames.map((streamName) =>
        getFeatures(streamName, { min_confidence: normalizedMinConfidence, limit: normalizedLimit })
      )
    );

    perStreamFeatureResults.forEach((result, index) => {
      const streamName = streamNames[index];
      if (result.status === 'rejected') {
        onFeatureFetchError?.(streamName, result.reason);
        return;
      }

      for (const feature of result.value) {
        knowledgeIndicators.push(featureToKnowledgeIndicatorFeature(feature));
      }
    });
  }

  if (includeQueries) {
    const queryLinks = await getQueries(streamNames, normalizedSearchText);
    for (const link of queryLinks) {
      knowledgeIndicators.push(queryLinkToKnowledgeIndicatorQuery(link));
    }
  }

  // Keep output stable and deterministic for callers/tests.
  const sorted = knowledgeIndicators.sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'feature' ? -1 : 1;
    }

    if (a.kind === 'feature' && b.kind === 'feature') {
      const confidenceDiff = b.feature.confidence - a.feature.confidence;
      if (confidenceDiff !== 0) return confidenceDiff;
      return a.feature.id.localeCompare(b.feature.id);
    }

    if (a.kind === 'query' && b.kind === 'query') {
      const aScore = a.query.severity_score ?? -1;
      const bScore = b.query.severity_score ?? -1;
      const scoreDiff = bScore - aScore;
      if (scoreDiff !== 0) return scoreDiff;
      return a.query.id.localeCompare(b.query.id);
    }

    return 0;
  });

  return {
    knowledge_indicators: sorted.slice(0, normalizedLimit),
  };
}
