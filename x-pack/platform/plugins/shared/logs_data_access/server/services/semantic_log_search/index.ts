/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Logger } from '@kbn/logging';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import type {
  SemanticLogSearchService,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
  ExpandPatternParams,
  ExpandPatternResult,
  LogPattern,
} from '../../../common/services/semantic_log_search/types';
import type { RegisterServicesParams } from '../register_services';
import {
  detectCapabilities,
  detectRerankCapability,
  type TargetCapabilities,
} from './capabilities';
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
 * Extract template_id from a hit's fields (accessed via docvalue_fields).
 * pattern_text only exposes template_id (a hash), not the template text.
 */
function extractTemplateIdFromHit(hit: SearchHit, templateIdField: string): string | undefined {
  const fields = hit.fields as Record<string, unknown[]> | undefined;
  if (!fields) return undefined;
  const values = fields[templateIdField];
  if (Array.isArray(values) && values.length > 0) {
    return String(values[0]);
  }
  return undefined;
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

  // Request 1: Semantic query with collapse, requesting template_id via docvalue_fields
  // pattern_text only exposes template_id (a hash), not the template text
  const searchQuery = buildSemanticSearchQuery({
    target,
    semanticField: semanticField.field,
    templateIdField: patternField.templateIdField,
    nlQuery,
    timeRange,
    size: maxPatterns,
  });

  // Add docvalue_fields to get template_id (it's not in _source)
  (searchQuery as Record<string, unknown>).docvalue_fields = [patternField.templateIdField];

  const searchResponse = await esClient.search(searchQuery);
  const hits = searchResponse.hits.hits;

  if (hits.length === 0) {
    return { patterns: [] };
  }

  // Extract unique template_ids and their sample docs
  const templateSamples = new Map<string, SearchHit>();
  for (const hit of hits) {
    const templateId = extractTemplateIdFromHit(hit, patternField.templateIdField);
    if (templateId && !templateSamples.has(templateId)) {
      templateSamples.set(templateId, hit);
    }
  }

  const templateIds = Array.from(templateSamples.keys());

  // If no templates were extracted, return empty
  if (templateIds.length === 0) {
    return { patterns: [] };
  }

  // Request 2: Get counts and time bounds using template_id
  const statsQuery = buildTemplateStatsQuery({
    target,
    templateField: patternField.templateIdField, // Use template_id, not template
    templateValues: templateIds,
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
  // pattern is the template_id hash; sample contains the human-readable message
  const patterns: LogPattern[] = [];
  for (const [templateId, sampleHit] of templateSamples) {
    const stats = statsMap.get(templateId);
    if (stats) {
      patterns.push({
        field: patternField.field,
        pattern: templateId, // This is the hash, used for expand
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
 * Row structure from the ES|QL CATEGORIZE + RERANK query.
 */
interface EsqlPatternRow {
  pattern: string;
  count: number;
  first_seen: string;
  last_seen: string;
  sample: string;
}

/**
 * Convert ES|QL columnar response to an array of typed objects.
 * This is the standard pattern used across Kibana (context_engine, entity_store, etc.).
 */
function esqlRowsToObjects<T>(response: ESQLSearchResponse): T[] {
  const columns = response.columns ?? [];
  return (response.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    row.forEach((value, index) => {
      const name = columns[index]?.name;
      if (name) {
        record[name] = value;
      }
    });
    return record as T;
  });
}

/**
 * Parse ES|QL response into LogPattern array.
 *
 * Expected columns from the ES|QL query:
 * - pattern: keyword (the categorized pattern)
 * - count: long
 * - first_seen: date
 * - last_seen: date
 * - sample: keyword (sample message)
 * - _score: double (rerank score, not mapped to LogPattern)
 *
 * Note: ES|QL CATEGORIZE does not provide _id/_index for the sample,
 * so sample only contains the message field.
 */
function parseEsqlPatternResponse(
  response: ESQLSearchResponse,
  field: string = 'message'
): LogPattern[] {
  const rows = esqlRowsToObjects<EsqlPatternRow>(response);

  return rows
    .filter((row) => row.pattern != null && row.count != null)
    .map((row) => ({
      field,
      pattern: String(row.pattern),
      count: Number(row.count),
      firstSeen: row.first_seen ? new Date(row.first_seen).toISOString() : new Date().toISOString(),
      lastSeen: row.last_seen ? new Date(row.last_seen).toISOString() : new Date().toISOString(),
      // ES|QL CATEGORIZE doesn't provide _id/_index, only the sample message
      sample: {
        message: row.sample ? String(row.sample) : '',
      },
    }));
}

/**
 * Execute semantic search using ES|QL RERANK + CATEGORIZE.
 *
 * This is the fallback path when no semantic_text field is available but
 * the cluster has the RERANK inference endpoint configured.
 *
 * Flow:
 * 1. CATEGORIZE extracts patterns from log messages
 * 2. RERANK scores patterns by semantic relevance to the query
 */
async function searchWithEsqlRerank(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
  const { esClient, target, nlQuery, timeRange, maxPatterns = DEFAULT_MAX_PATTERNS } = params;

  // Convert epoch ms to ISO strings for ES|QL standard time params
  const startIso = new Date(timeRange.start).toISOString();
  const endIso = new Date(timeRange.end).toISOString();

  // Build ES|QL query with CATEGORIZE + RERANK
  // Using standard ?_tstart/?_tend named parameters for time range
  const query = `
    FROM ${formatEsqlIdentifier(target)}
    | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
    | STATS 
        count = COUNT(*),
        first_seen = MIN(@timestamp),
        last_seen = MAX(@timestamp),
        sample = SAMPLE(message, 1)
      BY pattern = CATEGORIZE(message)
    | RERANK ?query ON pattern
    | SORT _score DESC
    | LIMIT ?limit
  `;

  try {
    const response = await esClient.esql.query({
      query,
      params: [
        { _tstart: startIso },
        { _tend: endIso },
        { query: nlQuery },
        { limit: maxPatterns },
      ],
    });

    return {
      patterns: parseEsqlPatternResponse(response as ESQLSearchResponse, 'message'),
    };
  } catch (error) {
    // Handle missing index gracefully (lazy initialization before first write)
    if (isEsqlUnknownIndexError(error)) {
      logger.debug(`ES|QL RERANK: index not found for target "${target}"`);
      return { patterns: [], unavailable: true };
    }
    // Log other errors (license, ES version, RERANK/CATEGORIZE failures)
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`ES|QL RERANK query failed for target "${target}": ${errorMessage}`);
    return { patterns: [], unavailable: true };
  }
}

/**
 * Creates the semantic log search service.
 *
 * The service provides two operations:
 * - `search`: finds log patterns matching a natural language query
 * - `expand`: retrieves raw documents for a specific pattern
 *
 * The capability ladder (from best to fallback):
 * 1. semantic_text + pattern_text: pre-indexed embeddings with exact template resolution
 * 2. semantic_text only: pre-indexed embeddings with runtime pattern extraction
 * 3. RERANK + CATEGORIZE: runtime semantic ranking via ES|QL (no pre-indexed embeddings)
 *
 * If none of these capabilities are available, `search` returns
 * `{ patterns: [], unavailable: true }`.
 *
 * Resolution strategy is hidden from callers. When `pattern_text` is mapped,
 * expand uses an exact term filter on the `.template_id` subfield (a hash).
 * Otherwise it uses approximate match query with `operator: 'and'`.
 *
 * Note: pattern_text only exposes template_id (a hash), not the template text.
 * The pattern in LogPattern is this hash when pattern_text is available.
 */
export function createSemanticLogSearchService(
  params: RegisterServicesParams
): SemanticLogSearchService {
  const { logger } = params;

  return {
    async search(searchParams: SemanticLogSearchParams): Promise<SemanticLogSearchResult> {
      const { esClient, target } = searchParams;

      // Detect target capabilities
      const capabilities = await detectCapabilities(esClient, target);

      // Level 1: semantic_text + pattern_text (best)
      if (capabilities.hasSemanticCapability && capabilities.hasPatternCapability) {
        return searchWithSemanticAndPattern(searchParams, capabilities);
      }

      // Level 2: semantic_text only
      if (capabilities.hasSemanticCapability) {
        return searchWithSemanticOnly(searchParams, capabilities);
      }

      // Level 3: Check for RERANK capability as fallback
      const hasRerank = await detectRerankCapability(esClient);
      if (hasRerank) {
        return searchWithEsqlRerank(searchParams, logger);
      }

      // No capability available
      return { patterns: [], unavailable: true };
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
        // Exact match on template_id (pattern is the hash)
        const patternField = capabilities.patternFields.find((pf) => pf.field === field);
        const templateIdField = patternField?.templateIdField ?? `${field}.template_id`;

        query = buildExpandQueryExact({
          target,
          templateField: templateIdField, // Use template_id, not template
          templateValue: pattern, // pattern is the hash
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
