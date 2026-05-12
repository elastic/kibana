/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { z } from '@kbn/zod/v4';
import type { AiClassifyStepOutputSchema } from '../../../../common/steps/ai';

export function validateModelResponse({
  modelResponse,
  expectedCategories,
  fallbackCategory,
  responseMetadata,
}: {
  modelResponse: z.infer<AiClassifyStepOutputSchema> | null | undefined;
  expectedCategories: string[];
  fallbackCategory: string | undefined;
  responseMetadata: Record<string, unknown>;
}): void {
  if (!modelResponse) {
    throw new ExecutionError({
      type: 'InvalidModelResponse',
      message: 'Model response is null or undefined.',
      details: {
        modelResponse,
        metadata: responseMetadata,
      },
    });
  }

  const returnedCategories = modelResponse.categories?.length
    ? modelResponse.categories
    : [modelResponse.category as string];
  const categoriesSet = new Set([
    ...expectedCategories,
    ...(fallbackCategory ? [fallbackCategory] : []),
  ]);

  const unexpectedCategories = returnedCategories.filter(
    (returnedCategory: string) => !categoriesSet.has(returnedCategory)
  );

  if (unexpectedCategories.length) {
    throw new ExecutionError({
      type: 'UnexpectedCategories',
      message: 'Model returned unexpected categories.',
      details: {
        modelResponse,
        metadata: responseMetadata,
      },
    });
  }
}
