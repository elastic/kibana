/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus as maintenanceWindowStatusV1 } from '../constants/v1';
import { scheduleResponseSchemaV1 } from '../../../../schedule';
import { maintenanceWindowScopeSchemaV1 } from '../../scope_schema_v1';

export const maintenanceWindowResponseSchema = schema.object(
  {
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
        schema.literal(maintenanceWindowStatusV1.DISABLED),
      ],
      {
        meta: {
          description: 'The current status of the maintenance window.',
        },
      }
    ),

    scope: schema.maybe(maintenanceWindowScopeSchemaV1),

    schedule: schema.object({
      custom: scheduleResponseSchemaV1,
    }),
  },
  { meta: { id: 'maintenance_window_response' } }
);
