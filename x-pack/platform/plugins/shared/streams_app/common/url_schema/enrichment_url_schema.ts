/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter, TimeRange } from '@kbn/es-query';
import { SampleDocument, sampleDocument } from '@kbn/streams-schema/src/shared/record_types';
import { z } from '@kbn/zod';

/**
 * Base interface for all data source types with common properties
 */
export interface BaseDataSource {
  enabled: boolean;
  name?: string;
}

/**
 * Base schema for common data source properties
 */
const baseDataSourceSchema = z.object({
  enabled: z.boolean(),
  name: z.string().optional(),
}) satisfies z.Schema<BaseDataSource>;

/**
 * Random samples data source that retrieves data from the stream index
 */
export interface RandomSamplesDataSource extends BaseDataSource {
  type: 'random-samples';
}

const randomSamplesDataSourceSchema = baseDataSourceSchema.extend({
  type: z.literal('random-samples'),
}) satisfies z.Schema<RandomSamplesDataSource>;

/**
 * KQL samples data source that retrieves data based on KQL query
 */
export interface KqlSamplesDataSource extends BaseDataSource {
  type: 'kql-samples';
  query: {
    language: string;
    query: string;
  };
  filters?: Filter[];
  timeRange: TimeRange;
}

const kqlSamplesDataSourceSchema = baseDataSourceSchema.extend({
  type: z.literal('kql-samples'),
  query: z.object({
    language: z.string(),
    query: z.string(),
  }),
  filters: z.array(z.any()).optional(),
  timeRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
}) satisfies z.Schema<KqlSamplesDataSource>;

/**
 * Custom samples data source with user-provided documents
 */
export interface CustomSamplesDataSource extends BaseDataSource {
  type: 'custom-samples';
  documents: SampleDocument[];
}

export const customSamplesDataSourceDocumentsSchema = z.array(sampleDocument);

export const customSamplesDataSourceSchema = baseDataSourceSchema.extend({
  type: z.literal('custom-samples'),
  documents: customSamplesDataSourceDocumentsSchema,
}) satisfies z.Schema<CustomSamplesDataSource>;

/**
 * Union type of all possible data source types
 */
export type EnrichmentDataSource =
  | RandomSamplesDataSource
  | KqlSamplesDataSource
  | CustomSamplesDataSource;

/**
 * Schema for validating enrichment data sources
 */
const enrichmentDataSourceSchema = z.union([
  randomSamplesDataSourceSchema,
  kqlSamplesDataSourceSchema,
  customSamplesDataSourceSchema,
]) satisfies z.Schema<EnrichmentDataSource>;

/**
 * URL state for enrichment configuration
 */
export interface EnrichmentUrlState {
  v: 1;
  dataSources: EnrichmentDataSource[];
}

/**
 * Schema for validating enrichment URL state
 */
export const enrichmentUrlSchema = z.object({
  v: z.literal(1),
  dataSources: z.array(enrichmentDataSourceSchema),
}) satisfies z.Schema<EnrichmentUrlState>;
