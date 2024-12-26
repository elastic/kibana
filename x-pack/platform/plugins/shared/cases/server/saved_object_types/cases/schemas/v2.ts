/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { casesSchema as casesSchemaV1 } from './v1';

export const casesSchema = casesSchemaV1.extends({
  observables: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.object({
          id: schema.string(),
          createdAt: schema.string(),
          updatedAt: schema.nullable(schema.string()),
          description: schema.nullable(schema.string()),
          typeKey: schema.string(),
          value: schema.any(),
        })
      )
    )
  ),
});
