/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CASE_EXTENDED_FIELDS } from '../../../../common/constants';
import { casesSchema as casesSchemaV8 } from './v8';

export const casesSchema = casesSchemaV8.extends({
  template: schema.maybe(
    schema.nullable(
      schema.object({
        id: schema.string(),
        version: schema.number(),
      })
    )
  ),
  [CASE_EXTENDED_FIELDS]: schema.maybe(
    schema.nullable(schema.recordOf(schema.string(), schema.string()))
  ),
});
