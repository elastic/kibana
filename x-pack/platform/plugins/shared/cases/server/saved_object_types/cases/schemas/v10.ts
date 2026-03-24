/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { casesSchema as casesSchemaV9 } from './v9';

export const casesSchema = casesSchemaV9.extends({
  task_summary: schema.maybe(
    schema.nullable(
      schema.object({
        total: schema.number(),
        open: schema.number(),
        in_progress: schema.number(),
        completed: schema.number(),
        cancelled: schema.number(),
        next_due_date: schema.maybe(schema.nullable(schema.string())),
      })
    )
  ),
});
