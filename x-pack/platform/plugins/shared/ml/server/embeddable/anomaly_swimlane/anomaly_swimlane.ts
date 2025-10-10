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

const commonUserInputProps = {
  jobIds: schema.arrayOf(schema.string()),
};

const anomalySwimlaneOverallSchema = schema.object({
  swimlaneType: schema.literal(SWIMLANE_TYPE.OVERALL),
  ...commonUserInputProps,
});

const anomalySwimlaneViewBySchema = schema.object({
  swimlaneType: schema.literal(SWIMLANE_TYPE.VIEW_BY),
  viewBy: schema.string(),
  ...commonUserInputProps,
});

const anomalySwimlaneEmbeddableCustomInputCommonSchema = schema.object({
  id: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
  filters: schema.maybe(schema.arrayOf(filterSchema)),
  query: schema.maybe(querySchema),
  timeRange: schema.maybe(timeRangeSchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
});

const anomalySwimlaneEmbeddableCustomInputViewBySchema = schema.object({
  ...anomalySwimlaneViewBySchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.getPropSchemas(),
});

const anomalySwimlaneEmbeddableCustomInputOverallSchema = schema.object({
  ...anomalySwimlaneOverallSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.getPropSchemas(),
});

export const anomalySwimlaneEmbeddableCustomInputSchema = schema.oneOf([
  anomalySwimlaneEmbeddableCustomInputViewBySchema,
  anomalySwimlaneEmbeddableCustomInputOverallSchema,
]);

export const anomalySwimLaneEmbeddableStateSchema = schema.oneOf([
  schema.object({
    ...serializedTitlesSchema.getPropSchemas(),
    ...anomalySwimlaneEmbeddableCustomInputViewBySchema.getPropSchemas(),
  }),
  schema.object({
    ...serializedTitlesSchema.getPropSchemas(),
    ...anomalySwimlaneEmbeddableCustomInputOverallSchema.getPropSchemas(),
  }),
]);
