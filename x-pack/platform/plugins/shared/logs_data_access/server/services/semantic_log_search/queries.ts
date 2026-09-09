/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchRequest,
  AggregationsAggregationContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '../../../common/services/semantic_log_search/types';

/**
 * Build a category query for approximate pattern matching.
 *
 * This is a simplified version of getCategoryQuery from @kbn/aiops-log-pattern-analysis,
 * which is not exported from the package. It builds a match query with operator: 'and'
 * to find documents containing all tokens in the pattern.
 *
 * Note: This is approximate - it matches documents containing all tokens regardless
 * of order, so it can over-match.
 */
function buildCategoryMatchQuery(field: string, pattern: string): QueryDslQueryContainer {
  return {
    match: {
      [field]: {
        query: pattern,
        operator: 'and',
        fuzziness: 0,
        auto_generate_synonyms_phrase_query: false,
      },
    },
  };
}

/**
 * Build a time range filter for @timestamp.
 */
export function buildTimeRangeFilter(timeRange: TimeRange): QueryDslQueryContainer {
  return {
    range: {
      '@timestamp': {
        gte: timeRange.start,
        lt: timeRange.end,
        format: 'epoch_millis',
      },
    },
  };
}

/**
 * Build a semantic query with collapse on template_id.
 *
 * This is request 1 of the two-request pattern:
 * - Semantic query finds relevant documents
 * - Collapse deduplicates by template
 * - Returns top N templates in relevance order with sample docs
 */
export function buildSemanticSearchQuery(params: {
  target: string;
  semanticField: string;
  templateIdField: string;
  nlQuery: string;
  timeRange: TimeRange;
  size: number;
}): SearchRequest {
  const { target, semanticField, templateIdField, nlQuery, timeRange, size } = params;

  return {
    index: target,
    size,
    track_total_hits: false,
    _source: true,
    query: {
      bool: {
        must: [
          {
            semantic: {
              field: semanticField,
              query: nlQuery,
            },
          },
        ],
        filter: [buildTimeRangeFilter(timeRange)],
      },
    },
    collapse: {
      field: templateIdField,
    },
    sort: [{ _score: { order: 'desc' } }],
  };
}

/**
 * Build a semantic query without collapse (for targets without pattern_text).
 *
 * When there's no template_id to collapse on, we return individual documents
 * that will be deduplicated later using categorize_text aggregation.
 */
export function buildSemanticSearchQueryNoCollapse(params: {
  target: string;
  semanticField: string;
  nlQuery: string;
  timeRange: TimeRange;
  size: number;
}): SearchRequest {
  const { target, semanticField, nlQuery, timeRange, size } = params;

  return {
    index: target,
    size,
    track_total_hits: false,
    _source: true,
    query: {
      bool: {
        must: [
          {
            semantic: {
              field: semanticField,
              query: nlQuery,
            },
          },
        ],
        filter: [buildTimeRangeFilter(timeRange)],
      },
    },
    sort: [{ _score: { order: 'desc' } }],
  };
}

/**
 * Build a terms aggregation to get counts and time bounds for specific templates.
 *
 * This is request 2 of the two-request pattern:
 * - Filters to the templates found in request 1
 * - Gets doc_count (prevalence) for each template
 * - Gets min/max @timestamp for firstSeen/lastSeen
 *
 * Note: This request does NOT include the semantic query, so counts reflect
 * total prevalence in the time window, not semantic match count.
 */
export function buildTemplateStatsQuery(params: {
  target: string;
  templateField: string;
  templateValues: string[];
  timeRange: TimeRange;
}): SearchRequest {
  const { target, templateField, templateValues, timeRange } = params;

  const aggs: Record<string, AggregationsAggregationContainer> = {
    templates: {
      terms: {
        field: templateField,
        include: templateValues,
        size: templateValues.length,
      },
      aggs: {
        first_seen: {
          min: {
            field: '@timestamp',
          },
        },
        last_seen: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  };

  return {
    index: target,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [buildTimeRangeFilter(timeRange)],
      },
    },
    aggs,
  };
}

/**
 * Build a query to expand a pattern using exact term match on template field.
 *
 * Used when pattern_text is mapped and we have an exact template value.
 */
export function buildExpandQueryExact(params: {
  target: string;
  templateField: string;
  templateValue: string;
  timeRange: TimeRange;
  pageSize: number;
  searchAfter?: Array<string | number>;
}): SearchRequest {
  const { target, templateField, templateValue, timeRange, pageSize, searchAfter } = params;

  const request: SearchRequest = {
    index: target,
    size: pageSize,
    track_total_hits: false,
    _source: true,
    query: {
      bool: {
        filter: [{ term: { [templateField]: templateValue } }, buildTimeRangeFilter(timeRange)],
      },
    },
    sort: [
      { '@timestamp': { order: 'desc' } },
      { _doc: { order: 'asc' } }, // tiebreaker
    ],
  };

  if (searchAfter) {
    request.search_after = searchAfter;
  }

  return request;
}

/**
 * Build a query to expand a pattern using approximate match.
 *
 * Used when pattern_text is NOT mapped and we need to match by token overlap.
 * This is approximate: it matches documents containing all tokens in the pattern,
 * regardless of order, so it can over-match.
 */
export function buildExpandQueryApproximate(params: {
  target: string;
  field: string;
  pattern: string;
  timeRange: TimeRange;
  pageSize: number;
  searchAfter?: Array<string | number>;
}): SearchRequest {
  const { target, field, pattern, timeRange, pageSize, searchAfter } = params;

  const request: SearchRequest = {
    index: target,
    size: pageSize,
    track_total_hits: false,
    _source: true,
    query: {
      bool: {
        must: [buildCategoryMatchQuery(field, pattern)],
        filter: [buildTimeRangeFilter(timeRange)],
      },
    },
    sort: [
      { '@timestamp': { order: 'desc' } },
      { _doc: { order: 'asc' } }, // tiebreaker
    ],
  };

  if (searchAfter) {
    request.search_after = searchAfter;
  }

  return request;
}

/**
 * Build a categorize_text aggregation query for pattern discovery.
 *
 * Used as a fallback when there's no semantic field. This runs categorize_text
 * to discover patterns at query time, which is more expensive than using
 * pre-indexed pattern_text but works on any text field.
 */
export function buildCategorizeTextQuery(params: {
  target: string;
  field: string;
  timeRange: TimeRange;
  maxPatterns: number;
}): SearchRequest {
  const { target, field, timeRange, maxPatterns } = params;

  return {
    index: target,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ exists: { field } }, buildTimeRangeFilter(timeRange)],
      },
    },
    aggs: {
      patterns: {
        categorize_text: {
          field,
          size: maxPatterns,
          min_doc_count: 1,
        },
        aggs: {
          first_seen: {
            min: { field: '@timestamp' },
          },
          last_seen: {
            max: { field: '@timestamp' },
          },
          sample: {
            top_hits: {
              size: 1,
              _source: true,
              sort: [{ '@timestamp': { order: 'desc' } }],
            },
          },
        },
      },
    },
  };
}
