/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// TODO schedule schema
const scheduleSchema = schema.object({
  duration: schema.number(),
  start: schema.string(),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(schema.string()),
      every: schema.maybe(schema.string()),
      onWeekDay: schema.maybe(schema.arrayOf(schema.string())),
      onMonthDay: schema.maybe(schema.arrayOf(schema.number())),
      onMonth: schema.maybe(schema.arrayOf(schema.string())),
      occurrences: schema.maybe(schema.number()),
    })
  ),
});

export const updateMaintenanceWindowRequestBodySchema = schema.object({
  title: schema.maybe(
    schema.string({
      meta: {
        description:
          'The name of the maintenance window. While this name does not have to be unique, a distinctive name can help you identify a specific maintenance window.',
      },
    })
  ),
  enabled: schema.maybe(
    schema.boolean({
      meta: {
        description:
          'Whether the current maintenance window is enabled. Disabled maintenance windows do not suppress notifications.',
      },
      defaultValue: true,
    })
  ),
  scope: schema.maybe(
    schema.object({
      query: schema.object({
        kql: schema.string({
          meta: { description: 'A filter written in Kibana Query Language (KQL).' },
        }),
      }),
    })
  ),
  schedule: schema.maybe(schema.object({ custom: schema.maybe(scheduleSchema) })),
});

export const updateMaintenanceWindowRequestParamsSchema = schema.object({
  id: schema.string(),
});
