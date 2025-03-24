/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export type EsqlRuleInstanceState = z.infer<typeof esqlRuleInstanceState>;
export const esqlRuleInstanceState = z.object({
  previousOriginalDocumentIds: z.string().array().optional(),
});

export type EsqlRuleParams = z.infer<typeof esqlRuleParams>;
export const esqlRuleParams = z.object({
  query: z.string(),
  timestampField: z.string(),
});
