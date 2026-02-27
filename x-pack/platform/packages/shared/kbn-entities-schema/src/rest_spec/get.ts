/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BooleanFromString } from '@kbn/zod-helpers';

export const getEntityDefinitionQuerySchema = z.object({
  page: z.optional(z.coerce.number()),
  perPage: z.optional(z.coerce.number()),
  includeState: z.optional(BooleanFromString).default(false),
});

export type GetEntityDefinitionQuerySchema = z.infer<typeof getEntityDefinitionQuerySchema>;
