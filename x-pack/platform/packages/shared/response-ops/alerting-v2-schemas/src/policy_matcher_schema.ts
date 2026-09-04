/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KQL_LENGTH } from './constants';

export const policyMatcherSchema = z.object({
  tags: z.array(z.string().min(1).max(256)).max(50).nullable().optional(),
  expression: z.string().max(MAX_KQL_LENGTH).nullable().optional(),
});

export type PolicyMatcher = z.infer<typeof policyMatcherSchema>;
