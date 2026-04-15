/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dateRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { transformHealthSchema } from '../../schema/health';

const postHealthScanParamsSchema = t.partial({
  body: t.partial({
    force: toBooleanRt,
  }),
});

interface PostHealthScanResponse {
  scanId: string;
  scheduledAt: string;
  status: 'scheduled' | 'pending' | 'completed';
  processed?: number;
  problematic?: number;
  error?: string;
}

const getHealthScanParamsSchema = t.intersection([
  t.type({
    path: t.type({
      scanId: t.string,
    }),
  }),
  t.partial({
    query: t.partial({
      size: toNumberRt,
      searchAfter: t.string,
      problematic: toBooleanRt,
      allSpaces: toBooleanRt,
    }),
  }),
]);

const listHealthScanParamsSchema = t.partial({
  query: t.partial({
    size: toNumberRt,
  }),
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

const healthScanResultResponseSchema = t.type({
  '@timestamp': dateRt,
  scanId: t.string,
  spaceId: t.string,
  slo: t.type({
    id: t.string,
    name: t.string,
    revision: t.number,
    enabled: t.boolean,
  }),
  health: t.type({
    isProblematic: t.boolean,
    rollup: transformHealthSchema,
    summary: transformHealthSchema,
  }),
});

type HealthScanResultResponse = t.OutputOf<typeof healthScanResultResponseSchema>;

interface GetHealthScanResultsResponse {
  results: HealthScanResultResponse[];
  scan: HealthScanSummary;
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
