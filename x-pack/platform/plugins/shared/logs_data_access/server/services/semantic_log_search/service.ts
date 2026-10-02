/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type {
  SemanticLogSearchService,
  SemanticLogSearchParams,
  SemanticLogSearchResult,
} from '../../../common/services/semantic_log_search/types';
import {
  ERROR_REASON,
  UNAVAILABLE_REASON,
} from '../../../common/services/semantic_log_search/constants';
import type { RegisterServicesParams } from '../register_services';
import { hasRequiredFields, detectRerankCapability } from './capabilities';
import { RERANK_ENDPOINT } from './constants';
import { searchWithEsqlRerank } from './strategies';
import { semanticLogSearchInputSchema } from './schema';
import { errorResult, unavailableResult, toFailureResult, SEARCH_PHASE } from './results';
import type { SemanticLogSearchDeps } from './types';

/** Validates search parameters, checks capabilities, and retrieves ranked log patterns. */
export async function search(
  params: SemanticLogSearchParams,
  deps: SemanticLogSearchDeps
): Promise<SemanticLogSearchResult> {
  const { logger, rerankInferenceId } = deps;
  const { esClient, abortSignal } = params;

  const validation = semanticLogSearchInputSchema.safeParse(params);
  if (!validation.success) {
    logger.warn(
      `Semantic log search rejected invalid parameters: ${z.prettifyError(validation.error)}`
    );
    return errorResult(ERROR_REASON.INVALID_PARAMS);
  }

  // Use validated values to preserve trimming and defaults; the client and signal bypass validation.
  const { target, nlQuery, timeRange, maxPatterns, kqlFilter } = validation.data;
  const input: SemanticLogSearchParams = {
    target,
    nlQuery,
    timeRange,
    maxPatterns,
    kqlFilter,
    esClient,
    abortSignal,
  };

  try {
    const fieldCheck = await hasRequiredFields(esClient, input.target);
    if (fieldCheck === 'no_matching_indices') {
      logger.debug(`Semantic log search found no indices matching target "${input.target}"`);
      return unavailableResult(UNAVAILABLE_REASON.NO_MATCHING_INDICES);
    }
    if (fieldCheck === 'missing_fields') {
      return unavailableResult(UNAVAILABLE_REASON.MISSING_FIELDS);
    }
    if (!(await detectRerankCapability(esClient, rerankInferenceId))) {
      // Log missing custom endpoints to help diagnose configuration errors.
      if (rerankInferenceId !== RERANK_ENDPOINT) {
        logger.warn(
          `Semantic log search is configured to use the inference endpoint "${rerankInferenceId}", ` +
            `which this cluster does not have. Check xpack.logsDataAccess.semanticLogSearch.rerankInferenceId; ` +
            `the default "${RERANK_ENDPOINT}" is preconfigured by Elasticsearch.`
        );
      }
      return unavailableResult(UNAVAILABLE_REASON.INFERENCE_UNAVAILABLE);
    }
  } catch (error) {
    return toFailureResult(error, {
      logger,
      target: input.target,
      phase: SEARCH_PHASE.CAPABILITIES,
    });
  }

  return searchWithEsqlRerank(input, deps);
}

/** Creates a semantic log search service with the plugin's logger and configured rerank endpoint. */
export function createSemanticLogSearchService(
  params: RegisterServicesParams
): SemanticLogSearchService {
  const { logger, config } = params;
  const deps: SemanticLogSearchDeps = {
    logger,
    rerankInferenceId: config.semanticLogSearch.rerankInferenceId,
  };

  return {
    search: (searchParams) => search(searchParams, deps),
  };
}
