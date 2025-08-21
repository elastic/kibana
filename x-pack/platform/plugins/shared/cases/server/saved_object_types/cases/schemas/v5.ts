/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { casesSchema as casesSchemaV4 } from './v4';

export const casesSchema = casesSchemaV4.extends({
  incremental_id: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.number(),
        schema.object({
          raw: schema.maybe(schema.string()),
        }),
      ])
    )
  ),
});
