/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertsFilterQuerySchema } from '../../../schemas/alerts_filter_query_schemas';
import { scheduleRequestSchema } from '../../../../routes/schemas/schedule';

export const updateMaintenanceWindowParamsSchema = schema.object({
  id: schema.string(),
  data: schema.object({
    title: schema.maybe(schema.string()),
    enabled: schema.maybe(schema.boolean()),
    schedule: schema.maybe(schema.object({ custom: scheduleRequestSchema })),
    scope: schema.maybe(
      schema.object({
        alerting: schema.nullable(alertsFilterQuerySchema),
      })
    ),
  }),
});
