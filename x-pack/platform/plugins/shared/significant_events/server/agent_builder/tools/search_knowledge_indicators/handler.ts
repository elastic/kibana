/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchKnowledgeIndicators } from '@kbn/streams-ai';
import type {
  KnowledgeIndicator,
  KnowledgeIndicatorFeature,
  KnowledgeIndicatorQuery,
  SearchKnowledgeIndicatorsInput,
} from '@kbn/streams-ai';
import type { Feature, StreamQuery } from '@kbn/significant-events-schema';
import { COMPUTED_FEATURE_TYPES, INFERRED_FEATURE_TYPES } from '@kbn/significant-events-schema';
import type { Logger } from '@kbn/core/server';
import type { StreamsClient } from '@kbn/streams-plugin/server';
import type {
  KnowledgeIndicatorClient,
  RuleUnbackedFilter,
} from '../../../lib/knowledge_indicators';

export const KNOWLEDGE_INDICATOR_FEATURE_TYPES = [
  ...COMPUTED_FEATURE_TYPES,
  ...INFERRED_FEATURE_TYPES,
] as const;

export type KnowledgeIndicatorFeatureType = (typeof KNOWLEDGE_INDICATOR_FEATURE_TYPES)[number];

export type KISearchView = 'compact' | 'full';
export type StrippedFeatureKeys = keyof Pick<
  KnowledgeIndicatorFeature['feature'],
  'uuid' | 'run_id' | 'updated_at' | 'expires_at' | 'confidence' | 'evidence_doc_ids'
>;

export type CompactFeature = Omit<Feature, StrippedFeatureKeys>;

export type CompactQuery = StreamQuery;

export interface CompactKnowledgeIndicatorFeature {
  kind: 'feature';
  feature: CompactFeature;
}

export interface CompactKnowledgeIndicatorQuery extends Omit<KnowledgeIndicatorQuery, 'query'> {
  query: CompactQuery;
}

export type CompactKnowledgeIndicator =
  | CompactKnowledgeIndicatorFeature
  | CompactKnowledgeIndicatorQuery;

interface KISearchEnvelope {
  page: number;
  per_page: number;
  returned: number;
  total: number;
  has_more: boolean;
  next_page: number | null;
}

export type KISearchOutput =
  | (KISearchEnvelope & { view: 'compact'; knowledge_indicators: CompactKnowledgeIndicator[] })
  | (KISearchEnvelope & { view: 'full'; knowledge_indicators: KnowledgeIndicator[] });

type ComputedFeatureType = (typeof COMPUTED_FEATURE_TYPES)[number];

const COMPUTED_FEATURE_TYPE_SET = new Set<string>(COMPUTED_FEATURE_TYPES);

function isComputedFeatureType(type: string): type is ComputedFeatureType {
  return COMPUTED_FEATURE_TYPE_SET.has(type);
}

const MAX_DATASET_ANALYSIS_FIELDS = 10;
const MAX_LOG_SAMPLES = 1;
const MAX_LOG_PATTERNS = 1;

function truncateComputedProperties(
  type: ComputedFeatureType,
  properties: Record<string, unknown>
): Record<string, unknown> {
  if (type === 'dataset_analysis') {
    const analysis = properties.analysis as
      | { total?: number; sampled?: number; fields?: Record<string, unknown> }
      | undefined;
    const fields = analysis?.fields ?? {};
    const allKeys = Object.keys(fields);
    return {
      analysis: {
        total: analysis?.total,
        sampled: analysis?.sampled,
        field_names: allKeys.slice(0, MAX_DATASET_ANALYSIS_FIELDS),
        fields_count: allKeys.length,
        truncated: allKeys.length > MAX_DATASET_ANALYSIS_FIELDS,
      },
    };
  }

  if (type === 'error_logs' || type === 'log_samples') {
    const samples = (properties.samples as unknown[]) ?? [];
    return {
      samples: samples.slice(0, MAX_LOG_SAMPLES),
      samples_count: samples.length,
      truncated: samples.length > MAX_LOG_SAMPLES,
    };
  }

  if (type === 'log_patterns') {
    const patterns = (properties.patterns as unknown[]) ?? [];
    return {
      patterns: patterns.slice(0, MAX_LOG_PATTERNS),
      patterns_count: patterns.length,
      truncated: patterns.length > MAX_LOG_PATTERNS,
    };
  }

  return properties;
}

function toCompactFeatureKI(ki: KnowledgeIndicatorFeature): CompactKnowledgeIndicatorFeature {
  const { uuid, run_id, updated_at, expires_at, confidence, evidence_doc_ids, filter, ...rest } =
    ki.feature;

  const properties = isComputedFeatureType(rest.type)
    ? truncateComputedProperties(rest.type, rest.properties)
    : rest.properties;

  return {
    kind: 'feature',
    feature: {
      ...rest,
      properties,
      // filter is omitted for entity features; restored for all other inferred types
      ...(rest.type !== 'entity' && filter !== undefined ? { filter } : {}),
    },
  };
}

export async function searchKnowledgeIndicatorsToolHandler({
  streamsClient,
  kiClient,
  logger,
  params,
  view,
}: {
  streamsClient: StreamsClient;
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
  params: SearchKnowledgeIndicatorsInput;
  view: KISearchView;
}): Promise<KISearchOutput> {
  const output = await searchKnowledgeIndicators({
    params,
    onFeatureFetchError: (streamName, error) => {
      const errorMessage =
        error instanceof Error ? error.stack || error.message : String(error ?? 'Unknown error');
      logger.warn(
        `ki_search: failed to fetch features for stream "${streamName}": ${errorMessage}`
      );
    },
    getStreamNames: async () => {
      const streams = await streamsClient.listStreams();
      return streams.map((stream) => stream.name);
    },
    getFeatures: async (streamName, { searchText, featureTypes, featureIds }) => {
      const result = searchText
        ? await kiClient.findFeatures(streamName, searchText, { featureTypes, featureIds })
        : await kiClient.getFeatures(streamName, { type: featureTypes, featureIds });
      return result.hits;
    },
    getQueries: async (streamNames, { searchText, queryTypes, queryIds, ruleIds, ruleBacked }) => {
      const ruleUnbacked: RuleUnbackedFilter =
        ruleBacked === undefined ? 'include' : ruleBacked ? 'exclude' : 'only';
      const filters = { ruleUnbacked, queryTypes, queryIds, ruleIds };
      const links = searchText
        ? await kiClient.findQueries(streamNames, searchText, filters)
        : await kiClient.getQueryLinks(streamNames, filters);
      return links;
    },
  });

  const envelope: KISearchEnvelope = {
    page: output.page,
    per_page: output.per_page,
    returned: output.returned,
    total: output.total,
    has_more: output.has_more,
    next_page: output.next_page,
  };

  if (view === 'full') {
    return { ...envelope, view: 'full', knowledge_indicators: output.knowledge_indicators };
  }

  return {
    ...envelope,
    view: 'compact',
    knowledge_indicators: output.knowledge_indicators.map((ki) =>
      ki.kind === 'feature' ? toCompactFeatureKI(ki) : ki
    ),
  };
}
