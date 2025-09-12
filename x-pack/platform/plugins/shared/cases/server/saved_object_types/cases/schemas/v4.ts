/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { casesSchema as casesSchemaV3 } from './v3';

export const casesSchema = casesSchemaV3.extends({
  in_progress_at: schema.maybe(schema.nullable(schema.string())),
  time_to_acknowledge: schema.maybe(schema.nullable(schema.number())),
  time_to_investigate: schema.maybe(schema.nullable(schema.number())),
  time_to_resolve: schema.maybe(schema.nullable(schema.number())),
  is_generated_by_assistant: schema.maybe(schema.nullable(schema.boolean())),
});
