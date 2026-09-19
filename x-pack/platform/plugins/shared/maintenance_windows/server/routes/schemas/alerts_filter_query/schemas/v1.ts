/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';
import { MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';

export const alertingV2ScopeSchema = schema.object(
  {
    enabled: schema.boolean({
      meta: { description: 'Whether the maintenance window applies to alerting v2 episodes.' },
    }),
    kql: schema.maybe(
      schema.string({
        maxLength: MAX_KQL_LENGTH,
        meta: {
          description:
            'A filter written in Kibana Query Language (KQL). Evaluated in memory against the alerting v2 episode context (episode_id, episode_status, rule.*, data.*).',
        },
      })
    ),
  },
  { meta: { id: 'maintenance_window_alerting_v2_scope' } }
);

export const alertsFilterQuerySchema = schema.object(
  {
    enabled: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: { description: 'Whether the maintenance window applies to alerting v1 alerts.' },
      })
    ),
    kql: schema.maybe(
      schema.string({
        maxLength: 10000,
        meta: { description: 'A filter written in Kibana Query Language (KQL).' },
      })
    ),
    filters: schema.maybe(
      schema.arrayOf(
        schema.object({
          query: schema.maybe(
            schema.recordOf(
              schema.string(),
              schema.any({
                meta: {
                  description: 'A query for the filter.',
                },
              })
            )
          ),
          meta: schema.recordOf(
            schema.string(),
            schema.any({
              meta: {
                description:
                  'An object with fields such as "controlledBy", "disabled", "field", "group", "index", "isMultiIndex", "key", "negate", "params",  "type", "value"',
              },
            })
          ),
          $state: schema.maybe(
            schema.object({
              store: schema.oneOf(
                [
                  schema.literal(FilterStateStore.APP_STATE),
                  schema.literal(FilterStateStore.GLOBAL_STATE),
                ],
                {
                  meta: {
                    description:
                      'A filter can be either specific to an application context or applied globally.',
                  },
                }
              ),
            })
          ),
        }),
        {
          maxSize: 100,
          meta: {
            description:
              'A filter written in Elasticsearch Query Domain Specific Language (DSL) as defined in the `kbn-es-query` package.',
          },
        }
      )
    ),
    dsl: schema.maybe(
      schema.string({
        maxLength: 10000,
        meta: {
          description: 'A filter written in Elasticsearch Query Domain Specific Language (DSL).',
        },
      })
    ),
  },
  { meta: { id: 'maintenance_window_alerts_filter_query' } }
);
