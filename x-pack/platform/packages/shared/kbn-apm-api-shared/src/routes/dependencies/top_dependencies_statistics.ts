/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

interface Statistics {
  latency: Array<{ x: number; y: number }>;
  errorRate: Array<{ x: number; y: number }>;
  throughput: Array<{ x: number; y: number | null }>;
}

export interface DependenciesTimeseriesStatisticsResponse {
  currentTimeseries: Record<string, Statistics>;
  comparisonTimeseries: Record<string, Statistics> | null;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value is an array of strings.
const dependencyNamesJsonSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string()));

export const topDependenciesStatisticsRoute =
  defineRoute<DependenciesTimeseriesStatisticsResponse>()({
    endpoint: 'POST /internal/apm/dependencies/top_dependencies/statistics',
    params: z.object({
      query: environmentSchema
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema)
        .merge(z.object({ numBuckets: z.coerce.number() })),
      body: z.object({ dependencyNames: dependencyNamesJsonSchema }),
    }),
  });
