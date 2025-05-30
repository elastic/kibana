/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const dataSourceBaseSchema = z.object({
  enabled: z.boolean(),
  name: z.string().optional(),
});

const randomSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('random-samples'),
  time: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

export type RandomSamplesDataSource = z.TypeOf<typeof randomSamplesDataSourceSchema>;

const kqlSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('kql-samples'),
  query: z.string(),
  time: z.object({
    from: z.string(),
    to: z.string(),
  }),
});

export type KqlSamplesDataSource = z.TypeOf<typeof kqlSamplesDataSourceSchema>;

const customSamplesDataSourceSchema = dataSourceBaseSchema.extend({
  type: z.literal('custom-samples'),
});

export type CustomSamplesDataSource = z.TypeOf<typeof customSamplesDataSourceSchema>;

const enrichmentDataSourceSchema = z.union([
  randomSamplesDataSourceSchema,
  kqlSamplesDataSourceSchema,
  customSamplesDataSourceSchema,
]);

export type EnrichmentDataSource = z.TypeOf<typeof enrichmentDataSourceSchema>;

export const enrichmentUrlSchema = z.object({
  v: z.literal(1),
  dataSources: z.array(enrichmentDataSourceSchema),
});

export type EnrichmentUrlState = z.TypeOf<typeof enrichmentUrlSchema>;
