/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from "@kbn/config-schema";

export const integrationSchemaV1 = schema.object({
  integration_id: schema.string(),
  data_stream_count: schema.number(),
  status: schema.string(),
  metadata: schema.object({
    title: schema.maybe(schema.string()),
    description: schema.maybe(schema.string()),
    updated_at: schema.maybe(schema.string()),
    created_at: schema.maybe(schema.string()),
    // allow other fields not explicitly defined here
  }, { unknowns: 'allow' }),
});
