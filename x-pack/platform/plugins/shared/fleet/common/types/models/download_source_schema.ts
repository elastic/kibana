/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const nullableString = schema.oneOf([schema.literal(null), schema.string()]);

export const downloadSourceSchemaV2 = schema.object(
  {
    source_id: schema.maybe(schema.string()),
    name: schema.maybe(schema.string()),
    is_default: schema.maybe(schema.boolean()),
    is_preconfigured: schema.maybe(schema.boolean()),
    host: schema.maybe(schema.string()),
    proxy_id: schema.maybe(nullableString),
    ssl: schema.maybe(nullableString),
    auth: schema.maybe(nullableString),
    secrets: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'ignore' }
);
