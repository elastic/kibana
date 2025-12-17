/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { timeRangeSchema } from '@kbn/es-query-server';
import { mlEntityFieldSchema } from '@kbn/ml-anomaly-utils/schemas';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

export const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export const anomalyChartsEmbeddableRuntimeStateSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  maxSeriesToPlot: schema.number(),
  severityThreshold: schema.maybe(schema.arrayOf(severityThresholdSchema)),
  selectedEntities: schema.maybe(schema.arrayOf(mlEntityFieldSchema)),
});

export const anomalyChartsEmbeddableOverridableStateSchema = schema.object({
  ...anomalyChartsEmbeddableRuntimeStateSchema.getPropSchemas(),
  timeRange: schema.maybe(timeRangeSchema),
});

export const anomalyChartsEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalyChartsEmbeddableOverridableStateSchema.getPropSchemas(),
});
