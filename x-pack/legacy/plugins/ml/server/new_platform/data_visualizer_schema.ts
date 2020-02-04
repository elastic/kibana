/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const dataVisualizerFieldStatsSchema = {
  params: schema.object({
    indexPatternTitle: schema.string(),
  }),
  body: schema.object({
    query: schema.string(),
    fields: schema.number(),
    samplerShardSize: schema.number(),
    timeFieldName: schema.string(),
    earliest: schema.number(),
    latest: schema.number(),
    interval: schema.number(),
    maxExample: schema.number(),
  }),
};

export const dataVisualizerOverallStatsSchema = {
  params: schema.object({
    indexPatternTitle: schema.string(),
  }),
  body: schema.object({
    query: schema.string(),
    aggregatableFields: schema.arrayOf(schema.string()),
    nonAggregatableFields: schema.arrayOf(schema.string()),
    samplerShardSize: schema.number(),
    timeFieldName: schema.string(),
    earliest: schema.number(),
    latest: schema.number(),
  }),
};
