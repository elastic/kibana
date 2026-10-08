/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery, type Filter, type Query } from '@kbn/es-query';
import type { AiInsightsSearchQuery } from '../../../common/ai_insights/types';

/**
 * Builds an Elasticsearch query that mirrors the dashboard time range, KQL/Lucene
 * search bar, and filters so metric prefetch stays aligned with what panels show.
 */
export function buildPrefetchQuery({
  timeField,
  timeRange,
  searchQuery,
  filters,
}: {
  timeField?: string;
  timeRange: { from: string; to: string };
  searchQuery?: AiInsightsSearchQuery;
  filters?: unknown[];
}): Record<string, unknown> {
  const timeFilters: Record<string, unknown>[] = [];

  if (timeField) {
    timeFilters.push({
      range: {
        [timeField]: {
          gte: timeRange.from,
          lte: timeRange.to,
        },
      },
    });
  }

  const language = searchQuery?.language;
  const queryText = searchQuery?.query?.trim() ?? '';
  const queries: Query[] =
    queryText && (language === 'kuery' || language === 'lucene')
      ? [{ language, query: queryText }]
      : [];

  const safeFilters = (Array.isArray(filters) ? filters : []) as Filter[];

  try {
    const built = buildEsQuery(undefined, queries, safeFilters, {
      allowLeadingWildcards: true,
      // Keep filters even when we lack a data-view field list (any dashboard / index).
      ignoreFilterIfFieldNotInIndex: false,
    });
    return {
      bool: {
        filter: [...timeFilters, ...built.bool.filter],
        must: built.bool.must,
        should: built.bool.should,
        must_not: built.bool.must_not,
      },
    };
  } catch {
    // Fall back to time-only when the search bar / filters cannot be parsed.
    return timeFilters.length ? { bool: { filter: timeFilters } } : { match_all: {} };
  }
}
