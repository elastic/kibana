/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { filterStateStoreSchema } from './filter_state_store';
import { filterMetaSchema } from './filter_meta';

export const filterSchema = schema.object({
  $state: schema.maybe(
    schema.object({
      store: schema.maybe(filterStateStoreSchema),
    })
  ),
  meta: filterMetaSchema,
  query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});
