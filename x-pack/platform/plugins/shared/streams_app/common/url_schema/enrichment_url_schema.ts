/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { z } from '@kbn/zod';

export interface RandomSamplesDataSource {
  enabled: boolean;
  type: 'random-samples';
}

const randomSamplesDataSourceSchema = z.object({
  enabled: z.boolean(),
  type: z.literal('random-samples'),
}) satisfies z.Schema<RandomSamplesDataSource>;

export interface KqlSamplesDataSource {
  type: 'kql-samples';
  enabled: boolean;
  name?: string;
  query: {
    language: string;
    query: string;
  };
  filters?: Filter[];
  time: {
    from: string;
    to: string;
  };
}

const kqlSamplesDataSourceSchema = z.object({
  enabled: z.boolean(),
  type: z.literal('kql-samples'),
  name: z.string().optional(),
  query: z.object({
    language: z.string(),
    query: z.string(),
  }),
  filters: z.array(z.any()).optional(),
  time: z.object({
    from: z.string(),
    to: z.string(),
  }),
}) satisfies z.Schema<KqlSamplesDataSource>;

export interface CustomSamplesDataSource {
  enabled: boolean;
  name?: string;
  type: 'custom-samples';
}

const customSamplesDataSourceSchema = z.object({
  enabled: z.boolean(),
  name: z.string().optional(),
  type: z.literal('custom-samples'),
}) satisfies z.Schema<CustomSamplesDataSource>;

export type EnrichmentDataSource =
  | RandomSamplesDataSource
  | KqlSamplesDataSource
  | CustomSamplesDataSource;

const enrichmentDataSourceSchema = z.union([
  randomSamplesDataSourceSchema,
  kqlSamplesDataSourceSchema,
  customSamplesDataSourceSchema,
]) satisfies z.Schema<EnrichmentDataSource>;

export interface EnrichmentUrlState {
  v: 1;
  dataSources: EnrichmentDataSource[];
}

export const enrichmentUrlSchema = z.object({
  v: z.literal(1),
  dataSources: z.array(enrichmentDataSourceSchema),
}) satisfies z.Schema<EnrichmentUrlState>;
