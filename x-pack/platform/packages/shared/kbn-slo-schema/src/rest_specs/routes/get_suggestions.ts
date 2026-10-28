/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod';

const getSLOSuggestionsResponseSchema = lazySchema(() => z.object({
  tags: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      count: z.number(),
    })
  ),
}));

type GetSLOSuggestionsResponse = z.input<typeof getSLOSuggestionsResponseSchema>;

export { getSLOSuggestionsResponseSchema };
export type { GetSLOSuggestionsResponse };
