/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TypeOf } from '@kbn/config-schema';
import { mlEntityFieldSchema } from '@kbn/ml-anomaly-utils/schemas';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export type SeverityThreshold = TypeOf<typeof severityThresholdSchema>;

export const anomalyChartsEmbeddableRuntimeStateSchema = schema.object({
  jobIds: schema.arrayOf(schema.string(), { maxSize: 10000 }),
  maxSeriesToPlot: schema.number(),
  severityThreshold: schema.maybe(schema.arrayOf(severityThresholdSchema, { maxSize: 10000 })),
  selectedEntities: schema.maybe(schema.arrayOf(mlEntityFieldSchema, { maxSize: 10000 })),
});

export type AnomalyChartsEmbeddableRuntimeState = TypeOf<
  typeof anomalyChartsEmbeddableRuntimeStateSchema
>;

export const anomalyChartsEmbeddableOverridableStateSchema = schema.object({
  ...anomalyChartsEmbeddableRuntimeStateSchema.getPropSchemas(),
  ...serializedTimeRangeSchema.getPropSchemas(),
});

export type AnomalyChartsEmbeddableOverridableState = TypeOf<
  typeof anomalyChartsEmbeddableOverridableStateSchema
>;

export const anomalyChartsEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalyChartsEmbeddableOverridableStateSchema.getPropSchemas(),
});

export type AnomalyChartsEmbeddableState = TypeOf<typeof anomalyChartsEmbeddableStateSchema>;
