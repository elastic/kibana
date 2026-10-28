/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z, lazySchema } from '@kbn/zod';

import { sloHealthSchema } from '../../schema/health';

const postHealthScanParamsSchema = lazySchema(() =>
  z.object({
    body: z
      .object({
        force: BooleanFromString.optional(),
      })
      .optional(),
  })
);

interface PostHealthScanResponse {
  scanId: string;
  scheduledAt: string;
  status: 'scheduled' | 'pending' | 'completed';
  processed?: number;
  problematic?: number;
  error?: string;
}

const getHealthScanParamsSchema = lazySchema(() =>
  z.object({
    path: z.object({
      scanId: z.string(),
    }),
    query: z
      .object({
        size: z.coerce.number().optional(),
        searchAfter: z.string().optional(),
        problematic: BooleanFromString.optional(),
        allSpaces: BooleanFromString.optional(),
      })
      .optional(),
  })
);

const listHealthScanParamsSchema = lazySchema(() =>
  z.object({
    query: z
      .object({
        size: z.coerce.number().optional(),
      })
      .optional(),
  })
);

interface HealthScanSummary {
  scanId: string;
  latestTimestamp: string;
  total: number;
  problematic: number;
  status: 'pending' | 'completed';
}

interface ListHealthScanResponse {
  scans: HealthScanSummary[];
}

const healthScanResultResponseSchema = lazySchema(() =>
  z.object({
    '@timestamp': z.string(),
    scanId: z.string(),
    spaceId: z.string(),
    slo: z.object({
      id: z.string(),
      name: z.string(),
      revision: z.number(),
      enabled: z.boolean(),
    }),
    health: sloHealthSchema,
  })
);

type HealthScanResultResponse = z.input<typeof healthScanResultResponseSchema>;

interface GetHealthScanResultsResponse {
  results: HealthScanResultResponse[];
  scan: HealthScanSummary;
  total: number;
  searchAfter?: string;
}

export { getHealthScanParamsSchema, listHealthScanParamsSchema, postHealthScanParamsSchema };
export type {
  GetHealthScanResultsResponse,
  HealthScanResultResponse,
  HealthScanSummary,
  ListHealthScanResponse,
  PostHealthScanResponse,
};
