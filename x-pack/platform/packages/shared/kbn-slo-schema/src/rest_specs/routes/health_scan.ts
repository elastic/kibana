/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { BooleanFromString } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';

import { MAX_KEYWORD_LENGTH } from '../../schema/zod/limits';
import { transformHealthSchema } from '../../schema/zod/health';

const postHealthScanParamsSchema = z.object({
  body: z
    .object({
      force: BooleanFromString.optional(),
    })
    .optional(),
});

interface PostHealthScanResponse {
  scanId: string;
  scheduledAt: string;
  status: 'scheduled' | 'pending' | 'completed';
  processed?: number;
  problematic?: number;
  error?: string;
}

const getHealthScanParamsSchema = z.object({
  path: z.object({
    scanId: z.string().max(MAX_KEYWORD_LENGTH),
  }),
  query: z
    .object({
      size: z.coerce.number().optional(),
      searchAfter: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      problematic: BooleanFromString.optional(),
      allSpaces: BooleanFromString.optional(),
    })
    .optional(),
});

const listHealthScanParamsSchema = z.object({
  query: z
    .object({
      size: z.coerce.number().optional(),
    })
    .optional(),
});

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

const healthScanResultResponseSchema = z.object({
  '@timestamp': z.string(),
  scanId: z.string(),
  spaceId: z.string(),
  slo: z.object({
    id: z.string(),
    name: z.string(),
    revision: z.number(),
    enabled: z.boolean(),
  }),
  health: z.object({
    isProblematic: z.boolean(),
    rollup: transformHealthSchema,
    summary: transformHealthSchema,
  }),
});

type HealthScanResultResponse = z.output<typeof healthScanResultResponseSchema>;

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
