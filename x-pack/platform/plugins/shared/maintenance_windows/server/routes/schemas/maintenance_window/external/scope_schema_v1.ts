/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';

/**
 * Shared scope schema for all three external API surfaces (create request, update request,
 * response). All three must reference the same `meta.id` so the OAS bundler emits a single
 * `$ref: '#/components/schemas/maintenance_window_scope'` instead of conflicting definitions.
 * Import this constant rather than re-declaring the object inline in each file.
 */
export const maintenanceWindowScopeSchemaV1 = schema.object(
  {
    alerting: schema.maybe(
      schema.object(
        {
          // `enabled` defaults to true when the sub-object is present so that existing clients
          // sending `scope: { alerting: {} }` continue to mean "v1 selected, no filter".
          enabled: schema.maybe(
            schema.boolean({
              defaultValue: true,
              meta: {
                description: 'Whether the maintenance window applies to alerting v1 alerts.',
              },
            })
          ),
          query: schema.maybe(
            schema.object({
              kql: schema.string({
                maxLength: 10000,
                meta: {
                  description:
                    'A filter written in Kibana Query Language (KQL). Only alerts matching this query will be suppressed by the maintenance window.',
                },
              }),
            })
          ),
        },
        {
          meta: {
            description:
              'Scope configuration for alerting v1. When present, the maintenance window applies to alerting v1 alerts. An absent `alerting` key means this MW does not apply to alerting v1.',
          },
        }
      )
    ),
    alerting_v2: schema.maybe(
      schema.object(
        {
          // `enabled` defaults to true when the sub-object is present so that existing clients
          // sending `scope: { alerting_v2: {} }` continue to mean "v2 selected, no filter".
          enabled: schema.maybe(
            schema.boolean({
              defaultValue: true,
              meta: {
                description: 'Whether the maintenance window applies to alerting v2 episodes.',
              },
            })
          ),
          query: schema.maybe(
            schema.object({
              kql: schema.string({
                maxLength: MAX_KQL_LENGTH,
                meta: {
                  description:
                    'A filter written in Kibana Query Language (KQL). Evaluated in memory against the alerting v2 episode context (episode_id, episode_status, rule.*, data.*). Only matching episodes will be suppressed.',
                },
              }),
            })
          ),
        },
        {
          meta: {
            description:
              'Scope configuration for alerting v2. When present, the maintenance window applies to alerting v2 episodes. An absent `alerting_v2` key means this MW does not apply to alerting v2.',
          },
        }
      )
    ),
  },
  { meta: { id: 'maintenance_window_scope' } }
);
