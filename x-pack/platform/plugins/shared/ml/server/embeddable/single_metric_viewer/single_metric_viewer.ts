/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { filterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { serializedTitlesSchema } from '../schemas';

export const singleMetricViewerEmbeddableUserInputSchema = schema.object({
  forecastId: schema.maybe(schema.string()),
  functionDescription: schema.maybe(schema.string()),
  jobIds: schema.arrayOf(schema.string()),
  selectedDetectorIndex: schema.number(),
  selectedEntities: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  panelTitle: schema.maybe(schema.string()),
});

const { panelTitle, ...baseUserInputProps } =
  singleMetricViewerEmbeddableUserInputSchema.getPropSchemas();

export const singleMetricViewerEmbeddableCustomInputSchema = schema.object({
  ...baseUserInputProps,
  id: schema.maybe(schema.string()),
  filters: schema.maybe(schema.arrayOf(filterSchema)),
  query: schema.maybe(querySchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
  timeRange: schema.maybe(timeRangeSchema),
});

export const singleMetricViewerEmbeddableInputSchema = schema.object({
  ...singleMetricViewerEmbeddableCustomInputSchema.getPropSchemas(),
  title: schema.maybe(schema.string()),
});

export const singleMetricViewerEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...singleMetricViewerEmbeddableCustomInputSchema.getPropSchemas(),
});
