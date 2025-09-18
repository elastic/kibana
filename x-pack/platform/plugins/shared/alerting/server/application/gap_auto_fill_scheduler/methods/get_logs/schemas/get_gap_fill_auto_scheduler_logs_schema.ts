/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const getGapFillAutoSchedulerLogsSchema = schema.object({
  id: schema.string(),
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
  page: schema.maybe(schema.number({ defaultValue: 1, min: 1 })),
  perPage: schema.maybe(schema.number({ defaultValue: 50, min: 1, max: 1000 })),
  sort: schema.maybe(
    schema.arrayOf(
      schema.object({
        field: schema.string(),
        direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
      })
    )
  ),
  filter: schema.maybe(schema.string()),
});
