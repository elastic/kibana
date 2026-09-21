/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus as maintenanceWindowStatusV1 } from '../constants/v1';
import { scheduleResponseSchemaV1 } from '../../../../schedule';

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

    scope: schema.maybe(
      schema.object(
        {
          // `alerting` is optional at the scope level to support alerting_v2-only maintenance
          // windows (new). When present, `query` remains required to preserve the GA contract.
          alerting: schema.maybe(
            schema.object({
              enabled: schema.maybe(
                schema.boolean({
                  meta: {
                    description: 'Whether the maintenance window applies to alerting v1 alerts.',
                  },
                })
              ),
              query: schema.object({
                kql: schema.string({
                  meta: {
                    description:
                      'A filter written in Kibana Query Language (KQL). Only alerts matching this query will be suppressed by the maintenance window.',
                  },
                }),
              }),
            })
          ),
          alerting_v2: schema.maybe(
            schema.object({
              enabled: schema.boolean({
                meta: {
                  description: 'Whether the maintenance window applies to alerting v2 episodes.',
                },
              }),
              query: schema.maybe(
                schema.object({
                  kql: schema.string({
                    meta: {
                      description:
                        'A filter written in Kibana Query Language (KQL). Evaluated in memory against the alerting v2 episode context.',
                    },
                  }),
                })
              ),
            })
          ),
        },
        { meta: { id: 'maintenance_window_scope' } }
      )
    ),

    schedule: schema.object({
      custom: scheduleResponseSchemaV1,
    }),
  },
  { meta: { id: 'maintenance_window_response' } }
);
