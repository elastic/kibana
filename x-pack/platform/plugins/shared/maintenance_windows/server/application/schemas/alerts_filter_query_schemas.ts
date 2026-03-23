/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';

export const alertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: schema.arrayOf(
    schema.object({
      query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      meta: schema.recordOf(schema.string(), schema.any()),
      $state: schema.maybe(
        schema.object({
          store: schema.oneOf([
            schema.literal(FilterStateStore.APP_STATE),
            schema.literal(FilterStateStore.GLOBAL_STATE),
          ]),
        })
      ),
    })
  ),
  dsl: schema.maybe(schema.string()),
});
