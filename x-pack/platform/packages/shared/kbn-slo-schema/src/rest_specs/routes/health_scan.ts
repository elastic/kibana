/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dateRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { transformHealthSchema } from '../../schema/health';

const postHealthScanParamsSchema = t.type({
  body: t.union([
    t.undefined,
    t.partial({
      force: toBooleanRt,
    }),
  ]),
});

interface PostHealthScanResponse {
  scanId: string;
  scheduledAt: string;
  status: 'scheduled' | 'pending' | 'done';
  processed?: number;
  problematic?: number;
  error?: string;
}

const getHealthScanParamsSchema = t.type({
  path: t.type({
    scanId: t.string,
  }),
  query: t.union([
    t.undefined,
    t.partial({
      size: toNumberRt,
      searchAfter: t.string,
      problematic: toBooleanRt,
    }),
  ]),
});

const listHealthScanParamsSchema = t.partial({
  query: t.partial({
    size: toNumberRt,
    searchAfter: t.string,
  }),
});

interface HealthScanSummary {
  scanId: string;
  latestTimestamp: string;
  total: number;
  problematic: number;
}

interface ListHealthScanResponse {
  scans: HealthScanSummary[];
  searchAfter?: string;
}

const healthScanResultResponseSchema = t.type({
  '@timestamp': dateRt,
  scanId: t.string,
  sloId: t.string,
  revision: t.number,
  isProblematic: t.boolean,
  health: t.type({
    isProblematic: t.boolean,
    rollup: transformHealthSchema,
    summary: transformHealthSchema,
  }),
});

type HealthScanResultResponse = t.OutputOf<typeof healthScanResultResponseSchema>;

interface GetHealthScanResultsResponse {
  results: HealthScanResultResponse[];
  total: number;
  searchAfter?: Array<string | number | null | boolean>;
}

export { getHealthScanParamsSchema, listHealthScanParamsSchema, postHealthScanParamsSchema };
export type {
  GetHealthScanResultsResponse,
  HealthScanResultResponse,
  HealthScanSummary,
  ListHealthScanResponse,
  PostHealthScanResponse,
};
