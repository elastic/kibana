/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const matcherDataFieldsQuerySchema = z
  .object({
    matcher: z
      .string()
      .min(1)
      .max(2048)
      .optional()
      .describe('Optional matcher expression used to scope suggested data field names.'),
  })
  .describe('Query parameters for matcher data field suggestions.');

export type MatcherDataFieldsQuery = z.infer<typeof matcherDataFieldsQuerySchema>;

export const matcherDataFieldsResponseSchema = z
  .array(z.string())
  .describe('The list of available matcher data field names.');

export type MatcherDataFieldsResponse = z.infer<typeof matcherDataFieldsResponseSchema>;
