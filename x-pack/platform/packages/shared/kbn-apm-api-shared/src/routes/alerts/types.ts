/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { AggregationType, type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { rangeSchema } from '../../default_api_types';

const searchConfigurationSchema = z.object({
  query: z.object({
    query: z.union([z.string(), z.record(z.string(), z.any())]),
    language: z.string(),
  }),
});

// Equivalent of io-ts's jsonRt.pipe(searchConfigurationRt): parse a JSON
// string, then validate the parsed value against searchConfigurationSchema.
const searchConfigurationJsonSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(searchConfigurationSchema);

export const alertParamsSchema = z
  .object({
    aggregationType: z
      .union([
        z.literal(AggregationType.Avg),
        z.literal(AggregationType.P95),
        z.literal(AggregationType.P99),
      ])
      .optional(),
    serviceName: z.string().optional(),
    errorGroupingKey: z.string().optional(),
    transactionType: z.string().optional(),
    transactionName: z.string().optional(),
    interval: z.string(),
    groupBy: z.array(z.string()).optional(),
    searchConfiguration: searchConfigurationJsonSchema.optional(),
  })
  .merge(environmentSchema)
  .merge(rangeSchema);

export type AlertParams = z.infer<typeof alertParamsSchema>;

export interface PreviewChartResponseItem {
  name: string;
  data: Coordinate[];
}

export interface PreviewChartResponse {
  series: PreviewChartResponseItem[];
  totalGroups: number;
}
