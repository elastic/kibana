/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';

export interface AlertsFilterQuerySchemaLimits {
  /** Max length of the `kql` string. Omit for no limit. */
  maxKqlLength?: number;
  /** Max number of `filters`. Omit for no limit. */
  maxFilters?: number;
  /** Max length of the `dsl` string. Omit for no limit. */
  maxDslLength?: number;
}

/**
 * Builds the alerts filter query schema. Limits default to unbounded so the
 * shared/public consumers (e.g. the alerting rule APIs) keep their existing
 * contract. Internal consumers that need request bounds (e.g. the Maintenance
 * Windows internal APIs) pass explicit limits.
 */
export const getAlertsFilterQuerySchema = (limits: AlertsFilterQuerySchemaLimits = {}) =>
  schema.object({
    kql: schema.string({
      maxLength: limits.maxKqlLength,
      meta: { description: 'A filter written in Kibana Query Language (KQL).' },
    }),
    filters: schema.arrayOf(
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
        maxSize: limits.maxFilters,
        meta: {
          description:
            'A filter written in Elasticsearch Query Domain Specific Language (DSL) as defined in the `kbn-es-query` package.',
        },
      }
    ),
    dsl: schema.maybe(
      schema.string({
        maxLength: limits.maxDslLength,
        meta: {
          description: 'A filter written in Elasticsearch Query Domain Specific Language (DSL).',
        },
      })
    ),
  });

export const alertsFilterQuerySchema = getAlertsFilterQuerySchema();
