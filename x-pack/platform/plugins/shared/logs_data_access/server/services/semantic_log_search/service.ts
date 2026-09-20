/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
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
import { searchWithEsqlRerank } from './strategies';
import { semanticLogSearchInputSchema } from './schema';
import { errorResult, unavailableResult, toFailureResult, SEARCH_PHASE } from './results';

/** Search for log patterns matching a natural language query. */
export async function search(
  params: SemanticLogSearchParams,
  logger: Logger
): Promise<SemanticLogSearchResult> {
  const { esClient, abortSignal } = params;

  const validation = semanticLogSearchInputSchema.safeParse(params);
  if (!validation.success) {
    logger.warn(
      `Semantic log search rejected invalid parameters: ${z.prettifyError(validation.error)}`
    );
    return errorResult(ERROR_REASON.INVALID_PARAMS);
  }

  // Re-attach non-parseable fields. Use validation.data so that zod's .trim() and .default()
  // coercions (e.g. trimmed target, applied maxPatterns default) take effect.
  const input: SemanticLogSearchParams = { ...validation.data, esClient, abortSignal };

  try {
    if (!(await hasRequiredFields(esClient, input.target))) {
      return unavailableResult(UNAVAILABLE_REASON.MISSING_FIELDS);
    }
    if (!(await detectRerankCapability(esClient))) {
      return unavailableResult(UNAVAILABLE_REASON.INFERENCE_UNAVAILABLE);
    }
  } catch (error) {
    return toFailureResult(error, {
      logger,
      target: input.target,
      phase: SEARCH_PHASE.CAPABILITIES,
    });
  }

  return searchWithEsqlRerank(input, logger);
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
