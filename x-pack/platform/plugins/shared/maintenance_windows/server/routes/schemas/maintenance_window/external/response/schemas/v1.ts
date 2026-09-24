/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';
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
          // `alerting` is required in the response to preserve the GA API contract introduced in
          // 9.1.0: clients reading this response can rely on `scope.alerting.query.kql` being set
          // whenever `scope` is present. The optional `enabled` field is new in this release and
          // acts as the discriminator: `enabled: false` means the window does not apply to
          // alerting v1 alerts (e.g. a v2-only window). When `enabled` is absent, clients should
          // treat it as `true` for backward compatibility.
          alerting: schema.object(
            {
              enabled: schema.maybe(
                schema.boolean({
                  meta: {
                    description:
                      'Whether this maintenance window applies to Alerting V1 alerts. If omitted, is treated as `true`.',
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
            },
            {
              meta: {
                description:
                  'Settings that control how this maintenance window affects Alerting V1 alerts, including an optional KQL filter. Always returned when scope is returned. Check `enabled` to see whether the maintenance window affects these alerts.',
              },
            }
          ),
          alerting_v2: schema.maybe(
            schema.object(
              {
                enabled: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'Whether the maintenance window applies to Alerting V2 alert episodes. If omitted, is treated as `true`.',
                    },
                  })
                ),
                query: schema.maybe(
                  schema.object({
                    kql: schema.string({
                      maxLength: MAX_KQL_LENGTH,
                      meta: {
                        description:
                          "A KQL filter that limits which Alerting V2 alert episodes this maintenance window affects. Matching alert episodes don't send notifications while the window is active. If query isn't returned, the window affects all Alerting V2 alert episodes.",
                      },
                    }),
                  })
                ),
              },
              {
                meta: {
                  description:
                    "Settings that control how this maintenance window affects Alerting V2 alerting episodes, including an optional KQL filter. If you omit `alerting_v2`, the maintenance window doesn't affect Alerting V2 alert episodes.",
                },
              }
            )
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
