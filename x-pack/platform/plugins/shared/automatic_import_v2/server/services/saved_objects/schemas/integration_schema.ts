/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { TASK_STATUSES } from '../constants';
import { MAX_ID_LENGTH, MAX_VERSION_LENGTH, MIN_VERSION_LENGTH } from './constants';

export const integrationSchemaV1 = schema.object({
  integration_id: schema.string({ maxLength: MAX_ID_LENGTH, minLength: 1 }),
  /**
   * @deprecated This field is kept for backwards compatibility with existing saved objects.
   * It is no longer written by the service and may be removed in a future major version.
   */
  data_stream_count: schema.maybe(schema.number()),
  created_by: schema.string({ minLength: 1 }),
  last_updated_by: schema.maybe(schema.string({ minLength: 1 })),
  last_updated_at: schema.maybe(schema.string()),
  status: schema.oneOf(
    Object.values(TASK_STATUSES).map((status) => schema.literal(status)) as [Type<string>]
  ),
  metadata: schema.object(
    {
      title: schema.string(),
      version: schema.maybe(
        schema.string({
          minLength: MIN_VERSION_LENGTH,
          maxLength: MAX_VERSION_LENGTH,
          validate(value) {
            if (!/^\d+\.\d+\.\d+$/.test(value)) {
              return 'version must be in semantic versioning format (x.y.z)';
            }
          },
        })
      ),
      logo: schema.maybe(schema.string()),
      description: schema.string(),
      created_at: schema.maybe(schema.string()),
      // allow other fields not explicitly defined here
    },
    { unknowns: 'allow' }
  ),
});
