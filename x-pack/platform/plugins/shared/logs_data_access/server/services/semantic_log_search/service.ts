/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  SemanticLogSearchService,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
  ExpandPatternParams,
  ExpandPatternResult,
} from '../../../common/services/semantic_log_search/types';
import type { RegisterServicesParams } from '../register_services';
import { detectCapabilities, detectRerankCapability } from './capabilities';
import { buildExpandQueryExact, buildExpandQueryApproximate } from './queries';
import {
  searchWithSemanticAndPattern,
  searchWithSemanticOnly,
  searchWithEsqlRerank,
} from './strategies';
import { DEFAULT_PAGE_SIZE } from './constants';

/**
 * Search for log patterns matching a natural language query.
 * Chooses the best strategy based on target capabilities.
 */
export async function search(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
  const { esClient, target } = params;

  const capabilities = await detectCapabilities(esClient, target);

  // Level 1: semantic_text + pattern_text (best)
  if (capabilities.hasSemanticCapability && capabilities.hasPatternCapability) {
    return searchWithSemanticAndPattern(params, capabilities);
  }

  // Level 2: semantic_text only
  if (capabilities.hasSemanticCapability) {
    return searchWithSemanticOnly(params, capabilities);
  }

  // Level 3: Check for RERANK capability as fallback
  const hasRerank = await detectRerankCapability(esClient);
  if (hasRerank) {
    return searchWithEsqlRerank(params, logger);
  }

  return { patterns: [], unavailable: true };
}

/**
 * Expand a pattern to retrieve raw documents.
 *
 * TODO: Revisit this operation. Not used in the current PoC.
 */
export async function expand(params: ExpandPatternParams): Promise<ExpandPatternResult> {
  const {
    esClient,
    target,
    field,
    pattern,
    timeRange,
    pageSize = DEFAULT_PAGE_SIZE,
    searchAfter,
  } = params;

  const capabilities = await detectCapabilities(esClient, target);

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

  const lastHit = hits[hits.length - 1];
  const nextSearchAfter = lastHit?.sort as Array<string | number> | undefined;

  return {
    documents,
    searchAfter: documents.length === pageSize ? nextSearchAfter : undefined,
  };
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
    search: (searchParams) => search(searchParams, logger),
    expand,
  };
}
