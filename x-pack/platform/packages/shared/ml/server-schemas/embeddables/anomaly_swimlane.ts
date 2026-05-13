/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { storedFilterSchema, querySchema } from '@kbn/es-query-server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const swimlaneTypeSchema = z.union([z.literal('overall'), z.literal('viewBy')]);

export type SwimlaneType = z.output<typeof swimlaneTypeSchema>;

const commonUserInputProps = z.object({
  jobIds: z.array(z.string()).max(10000),
});

const anomalySwimlaneOverallSchema = z.object({
  swimlaneType: z.literal('overall'),
  ...commonUserInputProps.shape,
});

const anomalySwimlaneViewBySchema = z.object({
  swimlaneType: z.literal('viewBy'),
  viewBy: z.string(),
  ...commonUserInputProps.shape,
});

const anomalySwimlaneEmbeddableCustomInputCommonSchema = z.object({
  ...serializedTimeRangeSchema.shape,
  id: z.string().optional(),
  perPage: z.number().optional(),
  filters: z.array(storedFilterSchema).max(10000).optional(),
  query: querySchema.optional(),
  refreshConfig: refreshIntervalSchema.optional(),
});

export const anomalySwimlaneEmbeddableCustomInputViewBySchema = z.object({
  ...anomalySwimlaneViewBySchema.shape,
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.shape,
});

export type AnomalySwimlaneEmbeddableCustomInputViewBy = z.output<
  typeof anomalySwimlaneEmbeddableCustomInputViewBySchema
>;

export const anomalySwimlaneEmbeddableCustomInputOverallSchema = z.object({
  ...anomalySwimlaneOverallSchema.shape,
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.shape,
});

export type AnomalySwimlaneEmbeddableCustomInputOverall = z.output<
  typeof anomalySwimlaneEmbeddableCustomInputOverallSchema
>;

export const anomalySwimlaneEmbeddableCustomInputSchema = z.union([
  anomalySwimlaneEmbeddableCustomInputViewBySchema,
  anomalySwimlaneEmbeddableCustomInputOverallSchema,
]);

export type AnomalySwimlaneEmbeddableCustomInput = z.output<
  typeof anomalySwimlaneEmbeddableCustomInputSchema
>;

export const anomalySwimlaneEmbeddableUserInputSchema = z.object({
  jobIds: z.array(z.string()).max(10000),
  swimlaneType: swimlaneTypeSchema,
  viewBy: z.string().optional(),
  panelTitle: z.string().optional(),
});

export type AnomalySwimlaneEmbeddableUserInput = z.output<
  typeof anomalySwimlaneEmbeddableUserInputSchema
>;

export const anomalySwimlanePropsSchema = z.object({
  ...anomalySwimlaneEmbeddableCustomInputCommonSchema.shape,
  ...anomalySwimlaneEmbeddableUserInputSchema.shape,
});

export type AnomalySwimlaneProps = z.output<typeof anomalySwimlanePropsSchema>;

export const anomalySwimlaneInitialInputSchema = z.object({
  jobIds: z.array(z.string()).max(10000).optional(),
  swimlaneType: swimlaneTypeSchema.optional(),
  viewBy: z.string().optional(),
  title: z.string().optional(),
  perPage: z.number().optional(),
});

export type AnomalySwimlaneInitialInput = z.output<typeof anomalySwimlaneInitialInputSchema>;

export const anomalySwimLaneControlsStateSchema = z.object({
  jobIds: z.array(z.string()).max(10000),
  swimlaneType: swimlaneTypeSchema,
  viewBy: z.string().optional(),
  perPage: z.number().optional(),
});

export type AnomalySwimLaneControlsState = z.output<typeof anomalySwimLaneControlsStateSchema>;

export const anomalySwimlaneEmbeddableStateViewBySchema = z.object({
  ...serializedTitlesSchema.shape,
  ...anomalySwimlaneEmbeddableCustomInputViewBySchema.shape,
});

export type AnomalySwimlaneEmbeddableStateViewBy = z.output<
  typeof anomalySwimlaneEmbeddableStateViewBySchema
>;

const anomalySwimlaneEmbeddableStateOverallSchema = z.object({
  ...serializedTitlesSchema.shape,
  ...anomalySwimlaneEmbeddableCustomInputOverallSchema.shape,
});

export const anomalySwimLaneEmbeddableStateSchema = z.union([
  anomalySwimlaneEmbeddableStateViewBySchema,
  anomalySwimlaneEmbeddableStateOverallSchema,
]);

export type AnomalySwimLaneEmbeddableState = z.output<typeof anomalySwimLaneEmbeddableStateSchema>;
