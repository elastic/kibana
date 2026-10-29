/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const findSLOInstancesParamsSchema = z.object({
  path: z.object({ id: z.string() }),
  query: z
    .object({
      search: z.string().optional(),
      size: z.coerce.number().optional(),
      searchAfter: z.string().optional(),
      remoteName: z.string().optional(),
    })
    .optional(),
});

interface FindSLOInstancesResponse {
  results: Array<{ instanceId: string; groupings: Record<string, string | number> }>;
  searchAfter?: string;
}

interface FindSLOInstancesParams {
  sloId: string;
  spaceId: string;
  search?: string;
  size?: number;
  searchAfter?: string;
  remoteName?: string;
}

export { findSLOInstancesParamsSchema };
export type { FindSLOInstancesParams, FindSLOInstancesResponse };
