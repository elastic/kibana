/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp, compact, intersection, trim, uniq } from 'lodash';
import type { Feature, QueryLink } from '@kbn/streams-schema';
import type {
  KnowledgeIndicator,
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsOutput,
} from './types';
import { featureToKnowledgeIndicatorFeature, queryLinkToKnowledgeIndicatorQuery } from './mappers';

export const DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_LIMIT = 50;

function byKindThenScore(a: KnowledgeIndicator, b: KnowledgeIndicator): number {
  if (a.kind !== b.kind) return a.kind === 'feature' ? -1 : 1;
  if (a.kind === 'feature' && b.kind === 'feature') {
    const d = (b.feature.confidence ?? 0) - (a.feature.confidence ?? 0);
    return d !== 0 ? d : a.feature.id.localeCompare(b.feature.id);
  }
  const d = (b.query.severity_score ?? -1) - (a.query.severity_score ?? -1);
  return d !== 0 ? d : a.query.id.localeCompare(b.query.id);
}

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
  onFeatureFetchError?: (streamName: string, error: unknown) => void;
  params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput> {
  // Step 1: Normalize params
  const searchText =
    typeof params.search_text === 'string' && trim(params.search_text)
      ? trim(params.search_text)
      : undefined;
  const limit =
    typeof params.limit === 'number' && params.limit > 0
      ? Math.floor(params.limit)
      : DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_LIMIT;
  const minConf =
    typeof params.min_confidence === 'number' ? clamp(params.min_confidence, 0, 100) : undefined;
  const kinds = Array.isArray(params.kind) && params.kind.length > 0 ? params.kind : null;
  const includeFeatures = !kinds || kinds.includes('feature');
  const includeQueries = !kinds || kinds.includes('query');

  // Step 2: Resolve stream names (requested ∩ accessible)
  const accessible = await getStreamNames();
  const streams = params.stream_names?.length
    ? intersection(uniq(params.stream_names), accessible)
    : accessible;
  const streamNames = compact(streams.filter((s) => typeof s === 'string' && s.length > 0));

  // Step 3: Fetch features (allSettled, best-effort)
  const features: KnowledgeIndicator[] = [];
  if (includeFeatures) {
    const settled = await Promise.allSettled(
      streamNames.map((n) => getFeatures(n, { min_confidence: minConf, limit }))
    );
    settled.forEach((r, i) => {
      if (r.status === 'rejected') onFeatureFetchError?.(streamNames[i], r.reason);
      else r.value.forEach((f) => features.push(featureToKnowledgeIndicatorFeature(f)));
    });
  }

  // Step 4: Fetch queries
  const queries: KnowledgeIndicator[] = includeQueries
    ? (await getQueries(streamNames, searchText)).map(queryLinkToKnowledgeIndicatorQuery)
    : [];

  // Step 5: Sort and limit
  const sorted = [...features, ...queries].sort(byKindThenScore);

  return { knowledge_indicators: sorted.slice(0, limit) };
}
