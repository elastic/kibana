/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { TASK_STATUSES } from '../constants';

export const integrationSchemaV1 = schema.object({
  integration_id: schema.string(),
  data_stream_count: schema.maybe(schema.number()),
  created_by: schema.string({ minLength: 1 }),
  status: schema.oneOf(
    Object.values(TASK_STATUSES).map((status) => schema.literal(status)) as [Type<string>]
  ),
  metadata: schema.object(
    {
      title: schema.maybe(schema.string()),
      logo: schema.maybe(schema.string()),
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
      description: schema.maybe(schema.string()),
      created_at: schema.maybe(schema.string()),
      // allow other fields not explicitly defined here
    },
    { unknowns: 'allow' }
  ),
});
