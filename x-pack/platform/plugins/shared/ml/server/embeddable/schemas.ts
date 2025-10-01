/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { refreshIntervalSchema } from '@kbn/data-service-server';
import { filterSchema, querySchema, timeRangeSchema } from '@kbn/es-query-server';
import { filterMetaParamsSchema } from './filter_meta_params';

const serializedTitlesSchemaConfigs = {
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  hidePanelTitles: schema.maybe(schema.boolean()),
};

const serializedTitlesSchema = schema.object(serializedTitlesSchemaConfigs);

export const filterStateStoreSchema = schema.oneOf([
  schema.literal('appState'),
  schema.literal('globalState'),
]);

export const filterMetaSchema = schema.object({
  alias: schema.maybe(schema.string()),
  disabled: schema.maybe(schema.boolean()),
  negate: schema.maybe(schema.boolean()),
  // controlledBy is there to identify who owns the filter
  controlledBy: schema.maybe(schema.string()),
  // allows grouping of filters
  group: schema.maybe(schema.string()),
  // index and type are optional only because when you create a new filter, there are no defaults
  index: schema.maybe(schema.string()),
  isMultiIndex: schema.maybe(schema.boolean()),
  type: schema.maybe(schema.string()),
  key: schema.maybe(schema.string()),
  params: schema.maybe(filterMetaParamsSchema),
  value: schema.maybe(schema.string()),
});

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

const anomalySwimlaneEmbeddableCustomInputConfigs = {
  id: schema.maybe(schema.string()),
  perPage: schema.maybe(schema.number()),
  filters: schema.maybe(filterSchema),
  query: schema.maybe(querySchema),
  timeRange: schema.maybe(timeRangeSchema),
  refreshConfig: schema.maybe(refreshIntervalSchema),
};

const anomalySwimlaneEmbeddableCustomInputSchema = schema.object({
  ...baseUserInputProps,
  ...anomalySwimlaneEmbeddableCustomInputConfigs,
});

export const anomalySwimLaneEmbeddableStateSchema = schema.object({
  ...serializedTitlesSchema.getPropSchemas(),
  ...anomalySwimlaneEmbeddableCustomInputSchema.getPropSchemas(),
});
