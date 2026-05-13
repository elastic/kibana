/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { mlEntityFieldSchema } from '@kbn/ml-anomaly-utils/schemas';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const severityThresholdSchema = z.object({
  min: z.number(),
  max: z.number().optional(),
});

export type SeverityThreshold = z.output<typeof severityThresholdSchema>;

export const anomalyChartsEmbeddableRuntimeStateSchema = z.object({
  jobIds: z.array(z.string()).max(10000),
  maxSeriesToPlot: z.number(),
  severityThreshold: z.array(severityThresholdSchema).max(10000).optional(),
  selectedEntities: z.array(mlEntityFieldSchema).max(10000).optional(),
});

export type AnomalyChartsEmbeddableRuntimeState = z.output<
  typeof anomalyChartsEmbeddableRuntimeStateSchema
>;

export const anomalyChartsEmbeddableOverridableStateSchema = z.object({
  ...anomalyChartsEmbeddableRuntimeStateSchema.shape,
  ...serializedTimeRangeSchema.shape,
});

export type AnomalyChartsEmbeddableOverridableState = z.output<
  typeof anomalyChartsEmbeddableOverridableStateSchema
>;

export const anomalyChartsEmbeddableStateSchema = z.object({
  ...serializedTitlesSchema.shape,
  ...anomalyChartsEmbeddableOverridableStateSchema.shape,
});

export type AnomalyChartsEmbeddableState = z.output<typeof anomalyChartsEmbeddableStateSchema>;
