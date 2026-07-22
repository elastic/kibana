/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface SuggestionsResponse {
  terms: string[];
}

export const suggestionsRoute = defineRoute<SuggestionsResponse>()({
  endpoint: 'GET /internal/apm/suggestions',
  params: z.object({
    query: z
      .object({
        fieldName: z.string(),
        fieldValue: z.string(),
      })
      .merge(rangeSchema)
      .extend({ serviceName: z.string().optional() }),
  }),
});
