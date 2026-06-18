/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { storedFilterSchema, querySchema } from '@kbn/es-query-server';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { mlEntityFieldValueSchema } from '@kbn/ml-anomaly-utils/schemas';

const baseUserInputProps = z
  .object({
    forecastId: z.string().optional(),
    functionDescription: z.string().optional(),
    jobIds: z.array(z.string()).max(10000),
    selectedDetectorIndex: z.number(),
    selectedEntities: z.record(z.string(), mlEntityFieldValueSchema.optional()).optional(),
  })
  .strict();

export const singleMetricViewerEmbeddableUserInputSchema = z
  .object({
    ...baseUserInputProps.shape,
    panelTitle: z.string().optional(),
  })
  .strict();

export type SingleMetricViewerEmbeddableUserInput = z.output<
  typeof singleMetricViewerEmbeddableUserInputSchema
>;

export const singleMetricViewerEmbeddableCustomInputSchema = z
  .object({
    ...baseUserInputProps.shape,
    ...serializedTimeRangeSchema.shape,
    id: z.string().optional(),
    filters: z.array(storedFilterSchema).max(10000).optional(),
    query: querySchema.optional(),
    refreshConfig: refreshIntervalSchema.optional(),
  })
  .strict();

export type SingleMetricViewerEmbeddableCustomInput = z.output<
  typeof singleMetricViewerEmbeddableCustomInputSchema
>;

export const singleMetricViewerEmbeddableInputSchema = z
  .object({
    ...singleMetricViewerEmbeddableCustomInputSchema.shape,
    title: z.string().optional(),
  })
  .strict();

export type SingleMetricViewerEmbeddableInput = z.output<
  typeof singleMetricViewerEmbeddableInputSchema
>;

export const singleMetricViewerEmbeddableStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...singleMetricViewerEmbeddableCustomInputSchema.shape,
  })
  .strict();

export type SingleMetricViewerEmbeddableState = z.output<
  typeof singleMetricViewerEmbeddableStateSchema
>;
