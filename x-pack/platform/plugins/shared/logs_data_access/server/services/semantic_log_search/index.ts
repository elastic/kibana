/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type {
  SemanticLogSearchService,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
  ExpandPatternParams,
  ExpandPatternResult,
  LogPattern,
} from '../../../common/services/semantic_log_search/types';
import type { RegisterServicesParams } from '../register_services';
import { detectCapabilities, type TargetCapabilities } from './capabilities';
import {
  buildSemanticSearchQuery,
  buildSemanticSearchQueryNoCollapse,
  buildTemplateStatsQuery,
  buildExpandQueryExact,
  buildExpandQueryApproximate,
  buildCategorizeTextQuery,
} from './queries';

const DEFAULT_MAX_PATTERNS = 10;
const DEFAULT_PAGE_SIZE = 50;

interface TemplateStats {
  pattern: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * Extract template value from a document based on capabilities.
 *
 * If pattern_text is mapped, the template is in `field.template`.
 * Otherwise, we use the raw field value (will be categorized later).
 */
function extractTemplateFromDoc(
  doc: SearchHit,
  field: string,
  hasPatternCapability: boolean
): string | undefined {
  const source = doc._source as Record<string, unknown> | undefined;
  if (!source) return undefined;

  if (hasPatternCapability) {
    // pattern_text creates a .template subfield
    const templateField = `${field}.template`;
    const parts = templateField.split('.');
    let value: unknown = source;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof value === 'string' ? value : undefined;
  } else {
    // No pattern_text, use raw field value
    const parts = field.split('.');
    let value: unknown = source;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof value === 'string' ? value : undefined;
  }
}

/**
 * Execute semantic search with collapse and fetch template stats.
 *
 * This is the primary path when both semantic_text and pattern_text are available:
 * 1. Semantic query with collapse on template_id
 * 2. Fetch counts and time bounds for the found templates
 */
async function searchWithSemanticAndPattern(
  params: SemanticLogSearchParams,
  capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  const { esClient, target, nlQuery, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  const semanticField = capabilities.primarySemanticField!;
  const patternField = capabilities.primaryPatternField!;

  // Request 1: Semantic query with collapse
  const searchQuery = buildSemanticSearchQuery({
    target,
    semanticField: semanticField.field,
    templateIdField: patternField.templateIdField,
    nlQuery,
    timeRange,
    size: maxPatterns,
  });

  const searchResponse = await esClient.search(searchQuery);
  const hits = searchResponse.hits.hits;

  if (hits.length === 0) {
    return { patterns: [] };
  }

  // Extract unique templates and their sample docs
  const templateSamples = new Map<string, SearchHit>();
  for (const hit of hits) {
    const template = extractTemplateFromDoc(hit, patternField.field, true);
    if (template && !templateSamples.has(template)) {
      templateSamples.set(template, hit);
    }
  }

  const templateValues = Array.from(templateSamples.keys());

  // Request 2: Get counts and time bounds
  const statsQuery = buildTemplateStatsQuery({
    target,
    templateField: patternField.templateField,
    templateValues,
    timeRange,
  });

  const statsResponse = await esClient.search(statsQuery);
  const templatesBuckets =
    (
      statsResponse.aggregations?.templates as {
        buckets: Array<{
          key: string;
          doc_count: number;
          first_seen: { value: number };
          last_seen: { value: number };
        }>;
      }
    )?.buckets ?? [];

  // Build stats map
  const statsMap = new Map<string, TemplateStats>();
  for (const bucket of templatesBuckets) {
    statsMap.set(bucket.key, {
      pattern: bucket.key,
      count: bucket.doc_count,
      firstSeen: new Date(bucket.first_seen.value).toISOString(),
      lastSeen: new Date(bucket.last_seen.value).toISOString(),
    });
  }

  // Combine into LogPattern results, preserving relevance order
  const patterns: LogPattern[] = [];
  for (const [template, sampleHit] of templateSamples) {
    const stats = statsMap.get(template);
    if (stats) {
      patterns.push({
        field: patternField.field,
        pattern: template,
        count: stats.count,
        firstSeen: stats.firstSeen,
        lastSeen: stats.lastSeen,
        sample: {
          _id: sampleHit._id,
          _index: sampleHit._index,
          ...(sampleHit._source as Record<string, unknown>),
        },
      });
    }
  }

  return { patterns };
}

/**
 * Execute semantic search without pattern_text, using categorize_text for dedup.
 *
 * This path is used when semantic_text is available but pattern_text is not:
 * 1. Semantic query (no collapse)
 * 2. Categorize_text aggregation on the results to find patterns
 */
async function searchWithSemanticOnly(
  params: SemanticLogSearchParams,
  capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  const { esClient, target, nlQuery, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  const semanticField = capabilities.primarySemanticField!;
  // Use 'message' as the categorization field if available
  const categorizationField =
    capabilities.fields.find((f) => f.path === 'message' && f.type === 'text')?.path ?? 'message';

  // Run semantic search to get relevant documents
  const searchQuery = buildSemanticSearchQueryNoCollapse({
    target,
    semanticField: semanticField.field,
    nlQuery,
    timeRange,
    size: maxPatterns * 10, // Get more docs to have enough for categorization
  });

  const searchResponse = await esClient.search(searchQuery);

  if (searchResponse.hits.hits.length === 0) {
    return { patterns: [] };
  }

  // Run categorize_text to find patterns
  const categorizeQuery = buildCategorizeTextQuery({
    target,
    field: categorizationField,
    timeRange,
    maxPatterns,
  });

  const categorizeResponse = await esClient.search(categorizeQuery);
  const patternBuckets =
    (
      categorizeResponse.aggregations?.patterns as {
        buckets: Array<{
          key: string;
          doc_count: number;
          first_seen: { value: number };
          last_seen: { value: number };
          sample: { hits: { hits: SearchHit[] } };
        }>;
      }
    )?.buckets ?? [];

  const patterns: LogPattern[] = patternBuckets.map((bucket) => {
    const sampleHit = bucket.sample.hits.hits[0];
    return {
      field: categorizationField,
      pattern: bucket.key,
      count: bucket.doc_count,
      firstSeen: new Date(bucket.first_seen.value).toISOString(),
      lastSeen: new Date(bucket.last_seen.value).toISOString(),
      sample: {
        _id: sampleHit?._id,
        _index: sampleHit?._index,
        ...(sampleHit?._source as Record<string, unknown>),
      },
    };
  });

  return { patterns };
}

/**
 * Execute pattern search without semantic, using categorize_text only.
 *
 * This is the fallback path when no semantic_text field is available.
 * Uses lexical-based categorize_text aggregation.
 *
 * Note: @kbn/ai-tools provides `getLogPatterns` which does similar categorization
 * with additional features (change detection, sampling optimization). However, it
 * requires a TracedElasticsearchClient. For the PoC we use direct categorize_text
 * to avoid the additional dependency. Consider migrating to getLogPatterns for
 * production if tracing and advanced features are needed.
 */
async function searchWithCategorizeText(
  params: SemanticLogSearchParams,
  capabilities: TargetCapabilities
): Promise<SemanticLogSearchResult> {
  const { esClient, target, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  // Use 'message' as the categorization field if available
  const categorizationField =
    capabilities.fields.find((f) => f.path === 'message' && f.type === 'text')?.path ??
    capabilities.fields.find((f) => f.type === 'text')?.path ??
    'message';

  const categorizeQuery = buildCategorizeTextQuery({
    target,
    field: categorizationField,
    timeRange,
    maxPatterns,
  });

  const categorizeResponse = await esClient.search(categorizeQuery);
  const patternBuckets =
    (
      categorizeResponse.aggregations?.patterns as {
        buckets: Array<{
          key: string;
          doc_count: number;
          first_seen: { value: number };
          last_seen: { value: number };
          sample: { hits: { hits: SearchHit[] } };
        }>;
      }
    )?.buckets ?? [];

  const patterns: LogPattern[] = patternBuckets.map((bucket) => {
    const sampleHit = bucket.sample.hits.hits[0];
    return {
      field: categorizationField,
      pattern: bucket.key,
      count: bucket.doc_count,
      firstSeen: new Date(bucket.first_seen.value).toISOString(),
      lastSeen: new Date(bucket.last_seen.value).toISOString(),
      sample: {
        _id: sampleHit?._id,
        _index: sampleHit?._index,
        ...(sampleHit?._source as Record<string, unknown>),
      },
    };
  });

  return { patterns };
}

/**
 * Creates the semantic log search service.
 *
 * The service provides two operations:
 * - `search`: finds log patterns matching a natural language query
 * - `expand`: retrieves raw documents for a specific pattern
 *
 * Resolution strategy is hidden from callers. When `pattern_text` is mapped,
 * expand uses an exact term filter on the `.template` subfield. Otherwise it
 * uses `getCategoryQuery` which is approximate.
 */
export function createSemanticLogSearchService(
  _params: RegisterServicesParams
): SemanticLogSearchService {
  return {
    async search(searchParams: SemanticLogSearchParams): Promise<SemanticLogSearchResult> {
      const { esClient, target } = searchParams;

      // Detect target capabilities
      const capabilities = await detectCapabilities(esClient, target);

      // Choose search strategy based on capabilities
      if (capabilities.hasSemanticCapability && capabilities.hasPatternCapability) {
        // Best case: semantic ranking with exact template resolution
        return searchWithSemanticAndPattern(searchParams, capabilities);
      } else if (capabilities.hasSemanticCapability) {
        // Semantic ranking, approximate resolution
        return searchWithSemanticOnly(searchParams, capabilities);
      } else {
        // Fallback: categorize_text only (no semantic ranking)
        return searchWithCategorizeText(searchParams, capabilities);
      }
    },

    async expand(expandParams: ExpandPatternParams): Promise<ExpandPatternResult> {
      const {
        esClient,
        target,
        field,
        pattern,
        timeRange,
        pageSize = DEFAULT_PAGE_SIZE,
        searchAfter,
      } = expandParams;

      // Detect capabilities to determine resolution strategy
      const capabilities = await detectCapabilities(esClient, target);

      // Choose expand strategy
      let query;
      if (capabilities.hasPatternCapability) {
        // Exact match on template field
        const patternField = capabilities.patternFields.find((pf) => pf.field === field);
        const templateField = patternField?.templateField ?? `${field}.template`;

        query = buildExpandQueryExact({
          target,
          templateField,
          templateValue: pattern,
          timeRange,
          pageSize,
          searchAfter,
        });
      } else {
        // Approximate match via getCategoryQuery
        query = buildExpandQueryApproximate({
          target,
          field,
          pattern,
          timeRange,
          pageSize,
          searchAfter,
        });
      }

      const response = await esClient.search(query);
      const hits = response.hits.hits;

      const documents = hits.map((hit) => ({
        _id: hit._id,
        _index: hit._index,
        ...(hit._source as Record<string, unknown>),
      }));

      // Get search_after from last hit for pagination
      const lastHit = hits[hits.length - 1];
      const nextSearchAfter = lastHit?.sort as Array<string | number> | undefined;

      return {
        documents,
        searchAfter: documents.length === pageSize ? nextSearchAfter : undefined,
      };
    },
  };
}
