/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { INPUT_TYPES, TASK_STATUSES } from '../constants';

export const dataStreamSchemaV1 = schema.object({
  integration_id: schema.string({ maxLength: 50, minLength: 1 }),
  data_stream_id: schema.string({ maxLength: 50, minLength: 1 }),
  created_by: schema.string({ minLength: 1 }),
  job_info: schema.object({
    job_id: schema.string({ maxLength: 50, minLength: 1 }),
    job_type: schema.string({ maxLength: 50, minLength: 1 }), // TODO: Add Enum
    status: schema.oneOf(
      Object.values(TASK_STATUSES).map((status) => schema.literal(status)) as [Type<string>]
    ),
  }),
  metadata: schema.object(
    {
      sample_count: schema.maybe(schema.number()),
      created_at: schema.maybe(schema.string({ minLength: 1 })),
      version: schema.maybe(
        schema.string({
          minLength: 5,
          maxLength: 20,
          validate(value) {
            if (!/^\d+\.\d+\.\d+$/.test(value)) {
              return 'version must be in semantic versioning format (x.y.z)';
            }
          },
        })
      ),
      input_type: schema.maybe(
        schema.oneOf(
          Object.values(INPUT_TYPES).map((status) => schema.literal(status)) as [Type<string>]
        )
      ),
    },
    { unknowns: 'allow' }
  ),
  result: schema.object({
    ingest_pipeline: schema.maybe(schema.string()),
    field_mapping: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    connector: schema.maybe(schema.string()),
  }),
});
