/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { filterMetaParamsSchema } from './filter_meta_params';

export const filterMetaObjectSchema = schema.object(
  {
    alias: schema.maybe(schema.string()),
    disabled: schema.maybe(schema.boolean()),
    negate: schema.maybe(schema.boolean()),
    controlledBy: schema.maybe(schema.string()),
    group: schema.maybe(schema.string()),
    index: schema.maybe(schema.string()),
    isMultiIndex: schema.maybe(schema.boolean()),
    type: schema.maybe(schema.string()),
    key: schema.maybe(schema.string()),
    params: schema.maybe(filterMetaParamsSchema),
    value: schema.maybe(schema.string()),
  },
  { meta: { id: 'filterMetaSchema' } }
);

export const filterMetaSchema = schema.lazy('filterMetaSchema');
