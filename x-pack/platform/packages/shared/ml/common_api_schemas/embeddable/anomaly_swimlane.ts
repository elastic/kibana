/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { filterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

import { SWIMLANE_TYPE } from './anomaly_swimlane_type';

const swimlaneTypeSchema = schema.oneOf([
  schema.literal(SWIMLANE_TYPE.OVERALL),
  schema.literal(SWIMLANE_TYPE.VIEW_BY),
]);

const commonUserInputProps = schema.object({
  jobIds: schema.arrayOf(schema.string()),
});

const anomalySwimlaneOverallSchema = schema.object({
  swimlaneType: schema.literal(SWIMLANE_TYPE.OVERALL),
  ...commonUserInputProps.getPropSchemas(),
});

const anomalySwimlaneViewBySchema = schema.object({
  swimlaneType: schema.literal(SWIMLANE_TYPE.VIEW_BY),
  viewBy: schema.string(),
  ...commonUserInputProps.getPropSchemas(),
});

const anomalySwimlaneEmbeddableCustomInputCommonSchema = schema.object({
  id: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
  filters: schema.maybe(schema.arrayOf(filterSchema)),
  query: schema.maybe(querySchema),
  timeRange: schema.maybe(timeRangeSchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
});

export const anomalySwimlaneEmbeddableCustomInputViewBySchema = schema.object({
  ...anomalySwimlaneViewBySchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.getPropSchemas(),
});

export type AnomalySwimlaneEmbeddableCustomInputViewBy = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputViewBySchema
>;

export const anomalySwimlaneEmbeddableCustomInputOverallSchema = schema.object({
  ...anomalySwimlaneOverallSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.getPropSchemas(),
});

export type AnomalySwimlaneEmbeddableCustomInputOverall = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputOverallSchema
>;

export const anomalySwimlaneEmbeddableCustomInputSchema = schema.oneOf([
  anomalySwimlaneEmbeddableCustomInputViewBySchema,
  anomalySwimlaneEmbeddableCustomInputOverallSchema,
]);

export type AnomalySwimlaneEmbeddableCustomInput = TypeOf<
  typeof anomalySwimlaneEmbeddableCustomInputSchema
>;

export const anomalySwimlaneEmbeddableUserInputSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  swimlaneType: swimlaneTypeSchema,
  viewBy: schema.maybe(schema.string()),
  panelTitle: schema.maybe(schema.string()),
});

export type AnomalySwimlaneEmbeddableUserInput = TypeOf<
  typeof anomalySwimlaneEmbeddableUserInputSchema
>;

export const anomalySwimlanePropsSchema = schema.object({
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableUserInputSchema.getPropSchemas(),
});

export type AnomalySwimlaneProps = TypeOf<typeof anomalySwimlanePropsSchema>;

export const anomalySwimlaneInitialInputSchema = schema.object({
  jobIds: schema.maybe(schema.arrayOf(schema.string())),
  swimlaneType: schema.maybe(swimlaneTypeSchema),
  viewBy: schema.maybe(schema.string()),
  title: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
});

export type AnomalySwimlaneInitialInput = TypeOf<typeof anomalySwimlaneInitialInputSchema>;

export const anomalySwimLaneControlsStateSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  swimlaneType: swimlaneTypeSchema,
  viewBy: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
});

export type AnomalySwimLaneControlsState = TypeOf<typeof anomalySwimLaneControlsStateSchema>;

export const anomalySwimlaneEmbeddableStateViewBySchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputViewBySchema.getPropSchemas(),
});

export type AnomalySwimlaneEmbeddableStateViewBy = TypeOf<
  typeof anomalySwimlaneEmbeddableStateViewBySchema
>;

const anomalySwimlaneEmbeddableStateOverallSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputOverallSchema.getPropSchemas(),
});

export const anomalySwimLaneEmbeddableStateSchema = schema.oneOf([
  anomalySwimlaneEmbeddableStateViewBySchema,
  anomalySwimlaneEmbeddableStateOverallSchema,
]);

export type AnomalySwimLaneEmbeddableState = TypeOf<typeof anomalySwimLaneEmbeddableStateSchema>;
