/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { storedFilterSchema, querySchema } from '@kbn/es-query-server';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { mlEntityFieldValueSchema } from '@kbn/ml-anomaly-utils/schemas';

const baseUserInputProps = schema.object({
  forecastId: schema.maybe(schema.string({ maxLength: 10000 })),
  functionDescription: schema.maybe(schema.string({ maxLength: 10000 })),
  jobIds: schema.arrayOf(schema.string({ maxLength: 10000 }), { maxSize: 10000 }),
  selectedDetectorIndex: schema.number(),
  selectedEntities: schema.maybe(
    schema.recordOf(schema.string({ maxLength: 10000 }), schema.maybe(mlEntityFieldValueSchema))
  ),
});

export const singleMetricViewerEmbeddableUserInputSchema = schema.object({
  ...baseUserInputProps.getPropSchemas(),
  panelTitle: schema.maybe(schema.string({ maxLength: 10000 })),
});

export const singleMetricViewerEmbeddableCustomInputSchema = schema.object({
  ...baseUserInputProps.getPropSchemas(),
  ...serializedTimeRangeSchema.getPropSchemas(),
  id: schema.maybe(schema.string({ maxLength: 10000 })),
  filters: schema.maybe(schema.arrayOf(storedFilterSchema, { maxSize: 10000 })),
  query: schema.maybe(querySchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
});

export const singleMetricViewerEmbeddableInputSchema = schema.object({
  ...singleMetricViewerEmbeddableCustomInputSchema.getPropSchemas(),
  title: schema.maybe(schema.string({ maxLength: 10000 })),
});

export const singleMetricViewerEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...singleMetricViewerEmbeddableCustomInputSchema.getPropSchemas(),
});
