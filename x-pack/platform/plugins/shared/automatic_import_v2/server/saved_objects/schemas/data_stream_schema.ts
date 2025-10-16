/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from "@kbn/config-schema";

export const dataStreamSchemaV1 = schema.object({
  integration_id: schema.string({ maxLength: 50, minLength: 1 }),
  data_stream_id: schema.string({ maxLength: 50, minLength: 1 }),
  job_info: schema.object({
    job_id: schema.string({ maxLength: 50, minLength: 1 }),
    job_type: schema.string({ maxLength: 50, minLength: 1 }),
    status: schema.oneOf([
      schema.literal('pending'),
      schema.literal('processing'),
      schema.literal('completed'),
      schema.literal('failed')
    ]),
  }),
  metadata: schema.object({
    sample_count: schema.number(),
    created_at: schema.maybe(schema.string({ minLength: 1 })),
    updated_at: schema.maybe(schema.string({ minLength: 1 })),
  }, { unknowns: 'allow' }),
  result: schema.object({
    ingest_pipeline: schema.maybe(schema.string()),
    field_mapping: schema.maybe(schema.string()),
  }),
});
