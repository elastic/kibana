/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { anomalyDetectionJobSchema } from './anomaly_detectors_schema';

export const estimateBucketSpanSchema = schema.object({
  aggTypes: schema.arrayOf(schema.nullable(schema.string())),
  duration: schema.object({ start: schema.number(), end: schema.number() }),
  fields: schema.arrayOf(schema.nullable(schema.string())),
  index: schema.string(),
  query: schema.any(),
  splitField: schema.maybe(schema.string()),
  timeField: schema.maybe(schema.string()),
});

export const modelMemoryLimitSchema = schema.object({
  indexPattern: schema.string(),
  splitFieldName: schema.string(),
  query: schema.any(),
  fieldNames: schema.arrayOf(schema.string()),
  influencerNames: schema.arrayOf(schema.maybe(schema.string())),
  timeFieldName: schema.string(),
  earliestMs: schema.number(),
  latestMs: schema.number(),
});

export const validateJobSchema = schema.object({
  duration: schema.object({
    start: schema.maybe(schema.number()),
    end: schema.maybe(schema.number()),
  }),
  fields: schema.maybe(schema.any()),
  job: schema.object(anomalyDetectionJobSchema),
});

const datafeedConfigSchema = schema.object({
  datafeed_id: schema.string(),
  aggregations: schema.maybe(schema.any()),
  aggs: schema.maybe(schema.any()),
  chunking_config: schema.maybe(schema.any()),
  frequency: schema.maybe(schema.string()),
  indices: schema.arrayOf(schema.string()),
  indexes: schema.maybe(schema.arrayOf(schema.string())),
  job_id: schema.string(),
  query: schema.any(),
  query_delay: schema.maybe(schema.string()),
  script_fields: schema.maybe(schema.any()),
  scroll_size: schema.maybe(schema.number()),
  delayed_data_check_config: schema.maybe(schema.any()),
});

export const validateCardinalitySchema = {
  ...anomalyDetectionJobSchema,
  datafeed_config: datafeedConfigSchema,
};
