/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { dateRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { transformHealthSchema } from '../../schema/health';

const postHealthDiagnoseParamsSchema = t.type({
  body: t.union([
    t.undefined,
    t.partial({
      force: toBooleanRt,
    }),
  ]),
});

interface PostHealthDiagnoseResponse {
  taskId: string;
  scheduledAt: string;
  status: 'scheduled' | 'pending' | 'done';
  processed?: number;
  problematic?: number;
  error?: string;
}

const getHealthDiagnoseParamsSchema = t.type({
  path: t.type({
    taskId: t.string,
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

const listHealthDiagnoseParamsSchema = t.partial({
  query: t.partial({
    size: toNumberRt,
    searchAfter: t.string,
  }),
});

interface HealthDiagnoseTaskSummary {
  taskId: string;
  latestTimestamp: string;
  total: number;
  problematic: number;
}

interface ListHealthDiagnoseResponse {
  tasks: HealthDiagnoseTaskSummary[];
  searchAfter?: string;
}

const healthDiagnoseResultResponseSchema = t.type({
  '@timestamp': dateRt,
  taskId: t.string,
  sloId: t.string,
  revision: t.number,
  isProblematic: t.boolean,
  health: t.type({
    isProblematic: t.boolean,
    rollup: transformHealthSchema,
    summary: transformHealthSchema,
  }),
});

type HealthDiagnoseResultResponse = t.OutputOf<typeof healthDiagnoseResultResponseSchema>;

interface GetHealthDiagnoseResponse {
  results: HealthDiagnoseResultResponse[];
  total: number;
  searchAfter?: Array<string | number | null | boolean>;
}

export {
  getHealthDiagnoseParamsSchema,
  listHealthDiagnoseParamsSchema,
  postHealthDiagnoseParamsSchema,
};
export type {
  GetHealthDiagnoseResponse,
  HealthDiagnoseResultResponse,
  HealthDiagnoseTaskSummary,
  ListHealthDiagnoseResponse,
  PostHealthDiagnoseResponse,
};
