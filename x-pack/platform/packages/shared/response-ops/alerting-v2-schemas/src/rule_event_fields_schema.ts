/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KQL_LENGTH } from './constants';

export const ruleEventFieldsQuerySchema = z
  .object({
    matcher: z
      .string()
      .min(1)
      .max(MAX_KQL_LENGTH)
      .optional()
      .describe('Optional matcher expression used to scope suggested rule event field names.'),
  })
  .strict()
  .describe('Query parameters for rule event field suggestions.');

export type RuleEventFieldsQuery = z.infer<typeof ruleEventFieldsQuerySchema>;

export const ruleEventFieldsResponseSchema = z
  .array(z.string())
  .describe('The list of available rule event field names.');

export type RuleEventFieldsResponse = z.infer<typeof ruleEventFieldsResponseSchema>;
