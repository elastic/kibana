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
} from '../../../common/services/semantic_log_search/types';
import type { RegisterServicesParams } from '../register_services';
import { hasRequiredFields, detectRerankCapability } from './capabilities';
import { DEFAULT_MAX_PATTERNS, MAX_PATTERNS } from './constants';
import { searchWithEsqlRerank } from './strategies';

const hasValidParams = ({
  target,
  nlQuery,
  timeRange,
  maxPatterns = DEFAULT_MAX_PATTERNS,
}: SemanticLogSearchParams): boolean =>
  target.trim().length > 0 &&
  nlQuery.trim().length > 0 &&
  Number.isFinite(timeRange.start) &&
  Number.isFinite(timeRange.end) &&
  timeRange.start < timeRange.end &&
  Number.isInteger(maxPatterns) &&
  maxPatterns >= 1 &&
  maxPatterns <= MAX_PATTERNS;

/** Search for log patterns matching a natural language query. */
export async function search(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
  const { esClient, target } = params;

  if (!hasValidParams(params)) {
    logger.warn('Semantic log search rejected invalid parameters');
    return { status: 'error', reason: 'execution' };
  }

  try {
    if (!(await hasRequiredFields(esClient, target))) {
      return { status: 'unavailable', reason: 'missing_fields' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Semantic log search field capability check failed: ${message}`);
    return { status: 'error', reason: 'execution' };
  }

  const hasRerank = await detectRerankCapability(esClient);
  if (!hasRerank) {
    return { status: 'unavailable', reason: 'inference_unavailable' };
  }

  return searchWithEsqlRerank(params, logger);
}

/** Creates the runtime semantic log search service. */
export function createSemanticLogSearchService(
  params: RegisterServicesParams
): SemanticLogSearchService {
  const { logger } = params;

  return {
    search: (searchParams) => search(searchParams, logger),
  };
}
