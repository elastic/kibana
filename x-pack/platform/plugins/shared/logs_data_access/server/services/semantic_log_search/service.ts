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
import { searchWithEsqlRerank } from './strategies';

/**
 * Search for log patterns matching a natural language query.
 *
 * The implemented path is RERANK + CATEGORIZE. The pre-indexed rungs
 * (semantic_text / pattern_text) are stubbed; the planned direction is to
 * feed patterns from Knowledge Indicators in the AI Index rather than
 * querying logs at request time.
 */
export async function search(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
  const { esClient, target } = params;

  const capabilities = await detectCapabilities(esClient, target);

  // Level 1: semantic_text + pattern_text (to be implemented)
  if (capabilities.hasSemanticCapability && capabilities.hasPatternCapability) {
    // return searchWithSemanticAndPattern(params, capabilities);
  }

  // Level 2: semantic_text only (to be implemented)
  if (capabilities.hasSemanticCapability) {
    // return searchWithSemanticOnly(params, capabilities);
  }

  const hasRerank = await detectRerankCapability(esClient);
  if (!hasRerank) {
    return { patterns: [], unavailable: true };
  }
  return searchWithEsqlRerank(params, logger);
}

/**
 * Expand a pattern to retrieve raw documents.
 *
 * To be implemented. See git history for the previous implementation.
 */
export async function expand(_params: ExpandPatternParams): Promise<ExpandPatternResult> {
  throw new Error('to be implemented');
}

/**
 * Creates the semantic log search service.
 *
 * The service provides two operations:
 * - `search`: finds log patterns matching a natural language query
 * - `expand`: retrieves raw documents for a specific pattern (to be implemented)
 *
 * The capability ladder:
 * 1. semantic_text + pattern_text: to be implemented (AI Index / Knowledge Indicators)
 * 2. semantic_text only: to be implemented (AI Index / Knowledge Indicators)
 * 3. RERANK + CATEGORIZE: the implemented path, runtime semantic ranking via ES|QL
 *
 * If RERANK is not available, `search` returns `{ patterns: [], unavailable: true }`.
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
