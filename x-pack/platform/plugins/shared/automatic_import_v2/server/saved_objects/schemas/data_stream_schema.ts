/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from "@kbn/config-schema";
import { TASK_STATUSES } from "../constants";

export const dataStreamSchemaV1 = schema.object({
  integration_id: schema.string({ maxLength: 50, minLength: 1 }),
  data_stream_id: schema.string({ maxLength: 50, minLength: 1 }),
  job_info: schema.object({
    job_id: schema.string({ maxLength: 50, minLength: 1 }),
    job_type: schema.string({ maxLength: 50, minLength: 1 }), // TODO: Add Enum
    status: schema.oneOf(Object.values(TASK_STATUSES).map(status => schema.literal(status)) as [Type<string>]),
  }),
  metadata: schema.object({
    sample_count: schema.number(),
    created_at: schema.maybe(schema.string({ minLength: 1 })),
  }, { unknowns: 'allow' }),
  result: schema.object({
    ingest_pipeline: schema.maybe(schema.string()),
    field_mapping: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    connector: schema.maybe(schema.string())
  }),
});
