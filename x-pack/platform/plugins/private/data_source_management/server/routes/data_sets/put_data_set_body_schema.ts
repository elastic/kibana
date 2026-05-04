/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const optionalString = schema.maybe(schema.string());

/**
 * Request body for `PUT .../data_sets/{id}`: {@link Dataset} (no top-level `name`;
 * the path supplies the id).
 */
export const putDataSetBodySchema = schema.object({
  dataSourceId: schema.string(),
  resource: schema.string(),
  description: optionalString,
  settings: schema.maybe(
    schema.object({
      format: schema.maybe(
        schema.oneOf([
          schema.literal('parquet'),
          schema.literal('csv'),
          schema.literal('ndjson'),
          schema.literal('orc'),
        ])
      ),
      errorMode: schema.maybe(
        schema.oneOf([
          schema.literal('fail_fast'),
          schema.literal('skip_row'),
          schema.literal('null_field'),
        ])
      ),
      maxErrors: schema.maybe(schema.number()),
      maxErrorRatio: schema.maybe(schema.number()),
      partitionDetection: schema.maybe(
        schema.oneOf([
          schema.literal('auto'),
          schema.literal('hive'),
          schema.literal('template'),
          schema.literal('none'),
        ])
      ),
      partitionPath: optionalString,
      hivePartitioning: schema.maybe(schema.boolean()),
    })
  ),
});
