/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, intersection, isString, uniq } from 'lodash';
import type { Feature, QueryLink } from '@kbn/significant-events-schema';
import type {
  KnowledgeIndicator,
  KnowledgeIndicatorFeature,
  KnowledgeIndicatorQuery,
  SearchKnowledgeIndicatorsInput,
  SearchKnowledgeIndicatorsOutput,
} from './types';
import { featureToKnowledgeIndicatorFeature, queryLinkToKnowledgeIndicatorQuery } from './mappers';

export const DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE = 50;

interface NormalizedParams {
  searchText: string | undefined;
  page: number;
  perPage: number;
  includeFeatures: boolean;
  includeQueries: boolean;
}

const isFeatureIndicator = (ki: KnowledgeIndicator): ki is KnowledgeIndicatorFeature =>
  ki.kind === 'feature';

const isQueryIndicator = (ki: KnowledgeIndicator): ki is KnowledgeIndicatorQuery =>
  ki.kind === 'query';

// Collects all source/target endpoints of dependency features that reference any of the seed IDs.
// Called once per filter pass so entity expansion doesn't re-scan the indicator list per indicator.
function buildConnectedEndpoints(
  indicators: KnowledgeIndicator[],
  featureIds: Set<string>
): Set<string> {
  const endpoints = new Set<string>();
  for (const ki of indicators) {
    if (!isFeatureIndicator(ki) || ki.feature.type !== 'dependency') continue;
    const { source, target } = ki.feature.properties;
    if (
      (isString(source) && featureIds.has(source)) ||
      (isString(target) && featureIds.has(target)) ||
      featureIds.has(ki.feature.id)
    ) {
      if (isString(source)) endpoints.add(source);
      if (isString(target)) endpoints.add(target);
    }
  }
  return endpoints;
}

function featureMatchesTopology(
  { feature }: KnowledgeIndicatorFeature,
  featureIds: Set<string>,
  connectedEndpoints: Set<string>
): boolean {
  if (featureIds.has(feature.id)) return true;
  const { type, properties } = feature;
  if (type === 'dependency') {
    const { source, target } = properties;
    return (
      (isString(source) && featureIds.has(source)) || (isString(target) && featureIds.has(target))
    );
  }
  if (type === 'entity') {
    const { name, technology } = properties;
    return (
      (isString(name) && connectedEndpoints.has(name)) ||
      (isString(technology) && connectedEndpoints.has(technology))
    );
  }
  return false;
}

/** Orders sources by slug, which people read, and falls back to the id for unknown sources. */
type SourceSortKey = (sourceId: string) => string;

const compareFeatures = (
  current: KnowledgeIndicatorFeature,
  next: KnowledgeIndicatorFeature,
  sourceSortKey: SourceSortKey
): number => {
  const byConfidence = (next.feature.confidence ?? 0) - (current.feature.confidence ?? 0);
  if (byConfidence !== 0) {
    return byConfidence;
  }
  const bySource = sourceSortKey(current.feature.source_id).localeCompare(
    sourceSortKey(next.feature.source_id)
  );
  if (bySource !== 0) {
    return bySource;
  }

  const byId = current.feature.id.localeCompare(next.feature.id);
  return byId !== 0 ? byId : current.feature.uuid.localeCompare(next.feature.uuid);
};

const compareQueries = (
  current: KnowledgeIndicatorQuery,
  next: KnowledgeIndicatorQuery,
  sourceSortKey: SourceSortKey
): number => {
  const byScore = (next.query.severity_score ?? -1) - (current.query.severity_score ?? -1);
  if (byScore !== 0) {
    return byScore;
  }
  const bySource = sourceSortKey(current.source_id).localeCompare(sourceSortKey(next.source_id));
  if (bySource !== 0) {
    return bySource;
  }

  const byId = current.query.id.localeCompare(next.query.id);
  return byId !== 0 ? byId : current.rule.id.localeCompare(next.rule.id);
};

function normalizeParams(params: SearchKnowledgeIndicatorsInput): NormalizedParams {
  const searchText = params.search_text ? params.search_text.trim() : undefined;
  const page = typeof params.page === 'number' && params.page > 0 ? Math.floor(params.page) : 1;
  const requestedPageSize = params.per_page;
  const perPage =
    typeof requestedPageSize === 'number' && requestedPageSize > 0
      ? Math.floor(requestedPageSize)
      : DEFAULT_SEARCH_KNOWLEDGE_INDICATORS_PER_PAGE;
  const kinds = params.kind?.length ? params.kind : undefined;

  return {
    searchText,
    page,
    perPage,
    includeFeatures: !kinds || kinds.includes('feature'),
    includeQueries: !kinds || kinds.includes('query'),
  };
}

async function resolveStreamNames(
  params: SearchKnowledgeIndicatorsInput,
  getStreamNames: () => Promise<string[]>
): Promise<string[]> {
  const accessible = await getStreamNames();
  const requested = params.source_ids?.length
    ? intersection(uniq(params.source_ids), accessible)
    : accessible;
  return compact(requested.filter((name) => typeof name === 'string' && name.length > 0));
}

async function fetchFeatureIndicators({
  sourceIds,
  searchText,
  featureTypes,
  featureIds,
  getFeatures,
  onFeatureFetchError,
}: {
  sourceIds: string[];
  searchText: string | undefined;
  featureTypes: SearchKnowledgeIndicatorsInput['feature_types'];
  featureIds: string[] | undefined;
  getFeatures: (
    sourceId: string,
    options: {
      searchText?: string;
      featureTypes?: SearchKnowledgeIndicatorsInput['feature_types'];
      featureIds?: string[];
    }
  ) => Promise<Feature[]>;
  onFeatureFetchError?: (sourceId: string, error: unknown) => void;
}): Promise<KnowledgeIndicatorFeature[]> {
  const results = await Promise.allSettled(
    sourceIds.map((name) => getFeatures(name, { searchText, featureTypes, featureIds }))
  );

  const indicators: KnowledgeIndicatorFeature[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      onFeatureFetchError?.(sourceIds[index], result.reason);
      return;
    }
    result.value.forEach((feature) => indicators.push(featureToKnowledgeIndicatorFeature(feature)));
  });

  return indicators;
}

async function fetchQueryIndicators(
  sourceIds: string[],
  options: {
    searchText: string | undefined;
    queryTypes: SearchKnowledgeIndicatorsInput['query_types'];
    queryIds: string[] | undefined;
    ruleIds: string[] | undefined;
    ruleBacked: boolean | undefined;
  },
  getQueries: (
    sourceIds: string[],
    options: {
      searchText?: string;
      queryTypes?: SearchKnowledgeIndicatorsInput['query_types'];
      queryIds?: string[];
      ruleIds?: string[];
      ruleBacked?: boolean;
    }
  ) => Promise<QueryLink[]>
): Promise<KnowledgeIndicatorQuery[]> {
  const links = await getQueries(sourceIds, options);
  return links.map(queryLinkToKnowledgeIndicatorQuery);
}

function filterIndicators(
  indicators: KnowledgeIndicator[],
  params: SearchKnowledgeIndicatorsInput
): KnowledgeIndicator[] {
  const featureIdSet = params.feature_ids?.length ? new Set(params.feature_ids) : undefined;
  const connectedEndpoints = featureIdSet
    ? buildConnectedEndpoints(indicators, featureIdSet)
    : new Set<string>();

  return indicators.filter((indicator) => {
    if (isFeatureIndicator(indicator)) {
      return (
        (!params.feature_types?.length || params.feature_types.includes(indicator.feature.type)) &&
        (!featureIdSet || featureMatchesTopology(indicator, featureIdSet, connectedEndpoints))
      );
    }

    return (
      (!params.query_types?.length || params.query_types.includes(indicator.query.type)) &&
      (!params.query_ids?.length || params.query_ids.includes(indicator.query.id)) &&
      (!params.rule_ids?.length || params.rule_ids.includes(indicator.rule.id)) &&
      (params.rule_backed === undefined || params.rule_backed === indicator.rule.backed)
    );
  });
}

function sortIndicators(
  indicators: KnowledgeIndicator[],
  sourceSortKey: SourceSortKey
): KnowledgeIndicator[] {
  return [...indicators].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'feature' ? -1 : 1;
    if (isFeatureIndicator(a) && isFeatureIndicator(b)) return compareFeatures(a, b, sourceSortKey);
    if (isQueryIndicator(a) && isQueryIndicator(b)) return compareQueries(a, b, sourceSortKey);
    return 0;
  });
}

export async function searchKnowledgeIndicators({
  getStreamNames,
  getSourceSlug,
  getFeatures,
  getQueries,
  onFeatureFetchError,
  params,
}: {
  getStreamNames(): Promise<string[]>;
  /** Slug of a source id, used to order results. Ids sort as is when it is omitted. */
  getSourceSlug?(sourceId: string): string | undefined;
  getFeatures(
    sourceId: string,
    options: {
      searchText?: string;
      featureTypes?: SearchKnowledgeIndicatorsInput['feature_types'];
      featureIds?: string[];
    }
  ): Promise<Feature[]>;
  getQueries(
    sourceIds: string[],
    options: {
      searchText?: string;
      queryTypes?: SearchKnowledgeIndicatorsInput['query_types'];
      queryIds?: string[];
      ruleIds?: string[];
      ruleBacked?: boolean;
    }
  ): Promise<QueryLink[]>;
  onFeatureFetchError?: (sourceId: string, error: unknown) => void;
  params: SearchKnowledgeIndicatorsInput;
}): Promise<SearchKnowledgeIndicatorsOutput> {
  // Step 1: Normalize inputs.
  const normalized = normalizeParams(params);

  // Step 2: Resolve streams (requested ∩ accessible).
  const sourceIds = await resolveStreamNames(params, getStreamNames);
  const hasRequestedStreamNames = Array.isArray(params.source_ids) && params.source_ids.length > 0;
  // Handle the case where no streams are accessible and streams were requested.
  if (hasRequestedStreamNames && sourceIds.length === 0) {
    return {
      knowledge_indicators: [],
      page: normalized.page,
      per_page: normalized.perPage,
      returned: 0,
      total: 0,
      has_more: false,
      next_page: null,
    };
  }

  // Step 3: Fetch features.
  const features = normalized.includeFeatures
    ? await fetchFeatureIndicators({
        sourceIds,
        searchText: normalized.searchText,
        featureTypes: params.feature_types,
        featureIds: params.feature_ids,
        getFeatures,
        onFeatureFetchError,
      })
    : [];

  // Step 4: Fetch queries.
  const queries = normalized.includeQueries
    ? await fetchQueryIndicators(
        sourceIds,
        {
          searchText: normalized.searchText,
          queryTypes: params.query_types,
          queryIds: params.query_ids,
          ruleIds: params.rule_ids,
          ruleBacked: params.rule_backed,
        },
        getQueries
      )
    : [];

  // Step 5: Filter defensively, sort deterministically, and paginate.
  const sorted = sortIndicators(
    filterIndicators([...features, ...queries], params),
    (sourceId) => getSourceSlug?.(sourceId) ?? sourceId
  );
  const offset = (normalized.page - 1) * normalized.perPage;
  const knowledgeIndicators = sorted.slice(offset, offset + normalized.perPage);
  const hasMore = normalized.page * normalized.perPage < sorted.length;
  return {
    knowledge_indicators: knowledgeIndicators,
    page: normalized.page,
    per_page: normalized.perPage,
    returned: knowledgeIndicators.length,
    total: sorted.length,
    has_more: hasMore,
    next_page: hasMore ? normalized.page + 1 : null,
  };
}
