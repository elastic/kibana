/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus as maintenanceWindowStatusV1 } from '../constants/v1';

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

const maintenanceWindowResponseFieldsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the maintenance window.',
    },
  }),
  title: schema.string({
    meta: {
      description: 'The name of the maintenance window.',
    },
  }),
  enabled: schema.boolean({
    meta: {
      description:
        'Whether the current maintenance window is enabled. Disabled maintenance windows do not suppress notifications.',
    },
  }),
  created_by: schema.nullable(
    schema.string({
      meta: {
        description: 'The identifier for the user that created the maintenance window.',
      },
    })
  ),
  updated_by: schema.nullable(
    schema.string({
      meta: {
        description: 'The identifier for the user that last updated this maintenance window.',
      },
    })
  ),
  created_at: schema.string({
    meta: {
      description: 'The date and time when the maintenance window was created.',
    },
  }),
  updated_at: schema.string({
    meta: {
      description: 'The date and time when the maintenance window was last updated.',
    },
  }),

  status: schema.oneOf(
    [
      schema.literal(maintenanceWindowStatusV1.RUNNING),
      schema.literal(maintenanceWindowStatusV1.UPCOMING),
      schema.literal(maintenanceWindowStatusV1.FINISHED),
      schema.literal(maintenanceWindowStatusV1.ARCHIVED),
    ],
    {
      meta: {
        description: 'The current status of the maintenance window.',
      },
    }
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
});

export const maintenanceWindowResponseSchema = schema.intersection([
  maintenanceWindowResponseFieldsSchema,
  scheduleSchema,
]);
