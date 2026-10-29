/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const CaseIdIncrementerAttributesSchema = z.object({
  '@timestamp': z.number(),
  updated_at: z.number(),
  last_id: z.number(),
});

export type CaseIdIncrementerAttributes = z.infer<typeof CaseIdIncrementerAttributesSchema>;
