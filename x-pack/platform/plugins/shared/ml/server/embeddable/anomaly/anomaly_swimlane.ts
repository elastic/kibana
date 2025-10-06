/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { filterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { serializedTitlesSchema } from '../common/serialized_titles';

const SWIMLANE_TYPE = {
  OVERALL: 'overall',
  VIEW_BY: 'viewBy',
} as const;

const swimlaneTypeSchema = schema.oneOf([
  schema.literal(SWIMLANE_TYPE.OVERALL),
  schema.literal(SWIMLANE_TYPE.VIEW_BY),
]);

const anomalySwimlaneEmbeddableUserInputSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  panelTitle: schema.maybe(schema.string()),
  swimlaneType: swimlaneTypeSchema,
  viewBy: schema.maybe(schema.string()),
});

const { panelTitle, ...baseUserInputProps } =
  anomalySwimlaneEmbeddableUserInputSchema.getPropSchemas();

const anomalySwimlaneEmbeddableCustomInputSchema = schema.object({
  ...baseUserInputProps,
  id: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
  filters: schema.maybe(schema.arrayOf(filterSchema)),
  query: schema.maybe(querySchema),
  timeRange: schema.maybe(timeRangeSchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
});

export const anomalySwimLaneEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputSchema.getPropSchemas(),
});
