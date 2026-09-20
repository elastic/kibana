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
import type { RegisterServicesParams } from '../register_services';
import { hasRequiredFields, detectRerankCapability } from './capabilities';
import { searchWithEsqlRerank } from './strategies';
import { semanticLogSearchInputSchema } from './schema';

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
    return { status: 'error', reason: 'invalid_params' };
  }

  // Re-attach non-parseable fields. Use validation.data so that zod's .trim() and .default()
  // coercions (e.g. trimmed target, applied maxPatterns default) take effect.
  const input: SemanticLogSearchParams = { ...validation.data, esClient, abortSignal };

  try {
    if (!(await hasRequiredFields(esClient, input.target))) {
      return { status: 'unavailable', reason: 'missing_fields' };
    }
    if (!(await detectRerankCapability(esClient))) {
      return { status: 'unavailable', reason: 'inference_unavailable' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Semantic log search capability check failed: ${message}`);
    return { status: 'error', reason: 'execution' };
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
