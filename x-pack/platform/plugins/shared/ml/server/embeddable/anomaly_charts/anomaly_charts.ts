/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { timeRangeSchema } from '@kbn/es-query-server';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from '@kbn/ml-anomaly-utils';
import { mlEntityFieldSchema } from '@kbn/ml-anomaly-utils/schemas';
import { serializedTitlesSchema } from '../schemas';

export const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export const mlEntityFieldTypeSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_TYPE.BY),
  schema.literal(ML_ENTITY_FIELD_TYPE.OVER),
  schema.literal(ML_ENTITY_FIELD_TYPE.PARTITON),
]);

export const mlEntityFieldOperationSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.ADD),
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.REMOVE),
]);

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
