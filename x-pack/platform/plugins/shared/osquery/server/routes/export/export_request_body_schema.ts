/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const esFilterSchema = schema.object(
  {
    meta: schema.object({}, { unknowns: 'allow' }),
    query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

export const exportRequestBodySchema = schema.nullable(
  schema.object({
    kuery: schema.maybe(schema.string()),
    agentIds: schema.maybe(schema.arrayOf(schema.string())),
    esFilters: schema.maybe(schema.arrayOf(esFilterSchema)),
  })
);
