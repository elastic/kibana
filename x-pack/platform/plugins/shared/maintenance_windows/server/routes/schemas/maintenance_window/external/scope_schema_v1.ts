/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';

/**
 * Shared scope schema for request bodies (create / update). Permissive: both alerting and
 * alerting_v2 keys are optional, and query is optional inside each. The response schema
 * maintains the stricter v1 contract (see response/schemas/v1.ts) to preserve backward
 * compatibility of the stable API.
 */
export const maintenanceWindowScopeSchemaV1 = schema.object(
  {
    alerting: schema.maybe(
      schema.object(
        {
          // `enabled` is optional; the request transform applies `?? true` so that existing
          // clients sending `scope: { alerting: {} }` continue to mean "v1 selected, no filter".
          enabled: schema.maybe(
            schema.boolean({
              meta: {
                description:
                  'Whether this maintenance window applies to Alerting V1 alerts. If omitted, is treated as `true`.',
              },
            })
          ),
          query: schema.maybe(
            schema.object({
              kql: schema.string({
                maxLength: 10000,
                meta: {
                  description:
                    "A KQL filter that limits which Alerting V1 alerts this maintenance window affects. Matching alerts don't run rule actions while the window is active. If you omit query, the window affects all alerts.",
                },
              }),
            })
          ),
        },
        {
          meta: {
            description:
              "Settings that control how this maintenance window affects Alerting V1 alerts, including an optional KQL filter. If you include `scope` but omit `alerting`, the maintenance window doesn't affect these alerts.",
          },
        }
      )
    ),
    alerting_v2: schema.maybe(
      schema.object(
        {
          // `enabled` is optional; the request transform applies `?? true` so that existing
          // clients sending `scope: { alerting_v2: {} }` continue to mean "v2 selected, no filter".
          enabled: schema.maybe(
            schema.boolean({
              meta: {
                description:
                  'Whether this maintenance window affects Alerting V2 alert episodes. Defaults to `true`.',
              },
            })
          ),
          query: schema.maybe(
            schema.object({
              kql: schema.string({
                maxLength: MAX_KQL_LENGTH,
                meta: {
                  description:
                    "A KQL filter that limits which Alerting V2 alert episodes this maintenance window affects. You can filter on `episode_id`, `episode_status`, `group_hash`, `last_event_timestamp`, `severity`, and `data.*`. Matching episodes don't send notifications while the window is active. If you omit query, the window affects all Alerting V2 alert episodes.",
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
  { meta: { id: 'maintenance_window_scope_request' } }
);
