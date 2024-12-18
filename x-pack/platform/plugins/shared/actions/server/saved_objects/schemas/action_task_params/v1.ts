/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const actionTaskParamsSchema = schema.object({
  actionId: schema.string(),
  executionId: schema.maybe(schema.string()),
  apiKey: schema.nullable(schema.string()),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), { defaultValue: {} }),
  consumer: schema.maybe(schema.string()),
  source: schema.maybe(schema.string()),
  relatedSavedObjects: schema.maybe(
    schema.arrayOf(
      schema.object({
        namespace: schema.maybe(schema.string({ minLength: 1 })),
        id: schema.string({ minLength: 1 }),
        type: schema.string({ minLength: 1 }),
        // optional; for SO types like action/alert that have type id's
        typeId: schema.maybe(schema.string({ minLength: 1 })),
      }),
      { defaultValue: [] }
    )
  ),
});
