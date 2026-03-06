/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  RefinePatternsPrompt,
  CLASSIFY_PATTERNS_TOOL_NAME,
  parseClassificationsFromResponse,
} from './refine_patterns_prompt';
import type { RefinePatternsBodySchema } from './refine_patterns_schema';
import { wrapError } from '../error_wrapper';

const MAX_PATTERNS = 100;
const MAX_EXAMPLES_PER_PATTERN = 5;

export const refinePatternsHandlerFactory = (
  inference: InferenceServerStart,
  logger: Logger
): RequestHandler<unknown, unknown, RefinePatternsBodySchema> => {
  return async (
    _context: RequestHandlerContext,
    request: KibanaRequest<unknown, unknown, RefinePatternsBodySchema>,
    response: KibanaResponseFactory
  ) => {
    const { categories: rawCategories, connectorId, fieldName } = request.body;

    const categories = rawCategories.slice(0, MAX_PATTERNS).map((c) => ({
      key: c.key,
      count: c.count,
      examples: c.examples.slice(0, MAX_EXAMPLES_PER_PATTERN),
    }));

    const abortController = new AbortController();
    request.events.aborted$.subscribe(() => abortController.abort());

    try {
      const client = inference.getClient({ request });

      const promptResponse = await client.prompt({
        connectorId,
        prompt: RefinePatternsPrompt,
        input: {
          categories,
          fieldName,
        },
        toolChoice: { function: CLASSIFY_PATTERNS_TOOL_NAME },
        abortSignal: abortController.signal,
      });

      const classifications = parseClassificationsFromResponse(promptResponse);

      if (classifications.length === 0) {
        logger.warn('Refine patterns: no tool call or invalid classifications in LLM response');
        return response.ok({
          body: { classifications: [] },
        });
      }

      const keySet = new Set(categories.map((c) => c.key));
      const valid = classifications.filter((c) => keySet.has(c.pattern_key));
      const missing = categories.filter((c) => !valid.some((v) => v.pattern_key === c.key));
      for (const c of missing) {
        valid.push({ pattern_key: c.key, label: 'important' });
      }

      return response.ok({
        body: { classifications: valid },
      });
    } catch (e) {
      logger.debug(() => e);
      return response.customError(wrapError(e));
    }
  };
};
