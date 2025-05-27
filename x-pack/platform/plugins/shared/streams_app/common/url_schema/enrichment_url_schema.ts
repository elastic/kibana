/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface DataSourceBase {
  enabled: boolean;
}

const dataSourceBaseSchema = z.object({
  enabled: z.boolean(),
}) satisfies z.ZodSchema<DataSourceBase>;

const randomSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('random-samples'),
  time: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

const kqlSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('kql-samples'),
  query: z.string(),
  time: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

const customSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('custom-samples'),
});

const dataSourceSchema = z.union([
  randomSamplesDataSourceSchema,
  kqlSamplesDataSourceSchema,
  customSamplesDataSourceSchema,
]);

export const enrichmentUrlSchema = z.object({
  v: z.literal(1),
  dataSources: z.array(dataSourceSchema),
});

export type EnrichmentUrlState = z.TypeOf<typeof enrichmentUrlSchema>;
