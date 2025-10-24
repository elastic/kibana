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

export const integrationSchemaV1 = schema.object({
  integration_id: schema.string(),
  data_stream_count: schema.number(),
  created_by: schema.string({ minLength: 1 }),
  status: schema.oneOf(Object.values(TASK_STATUSES).map(status => schema.literal(status)) as [Type<string>]),
  metadata: schema.object({
    title: schema.maybe(schema.string()),
    version: schema.maybe(schema.string({
      minLength: 5,
      maxLength: 20,
    })),
    description: schema.maybe(schema.string()),
    created_at: schema.maybe(schema.string()),
    // allow other fields not explicitly defined here
  }, { unknowns: 'allow' }),
});
