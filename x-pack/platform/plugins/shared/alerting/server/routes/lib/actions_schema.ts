/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';
import { validateTimezone } from './validate_timezone';
import { validateDurationSchema } from '../../lib';
import { validateHours } from './validate_hours';

export const actionsSchema = schema.arrayOf(
  schema.object({
    group: schema.maybe(schema.string()),
    id: schema.string(),
    params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
    frequency: schema.maybe(
      schema.object({
        summary: schema.boolean(),
        notify_when: schema.oneOf([
          schema.literal('onActionGroupChange'),
          schema.literal('onActiveAlert'),
          schema.literal('onThrottleInterval'),
        ]),
        throttle: schema.nullable(schema.string({ validate: validateDurationSchema })),
      })
    ),
    uuid: schema.maybe(schema.string()),
    alerts_filter: schema.maybe(
      schema.object({
        query: schema.maybe(
          schema.object({
            kql: schema.string(),
            filters: schema.arrayOf(
              schema.object({
                query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
                meta: schema.recordOf(schema.string(), schema.any()),
                $state: schema.maybe(
                  schema.object({
                    store: schema.oneOf([
                      schema.literal(FilterStateStore.APP_STATE),
                      schema.literal(FilterStateStore.GLOBAL_STATE),
                    ]),
                  })
                ),
              })
            ),
            dsl: schema.maybe(schema.string()),
          })
        ),
        timeframe: schema.maybe(
          schema.object({
            days: schema.arrayOf(
              schema.oneOf([
                schema.literal(1),
                schema.literal(2),
                schema.literal(3),
                schema.literal(4),
                schema.literal(5),
                schema.literal(6),
                schema.literal(7),
              ])
            ),
            hours: schema.object({
              start: schema.string({
                validate: validateHours,
              }),
              end: schema.string({
                validate: validateHours,
              }),
            }),
            timezone: schema.string({ validate: validateTimezone }),
          })
        ),
      })
    ),
    use_alert_data_for_template: schema.maybe(schema.boolean()),
  }),
  { defaultValue: [] }
);

export const systemActionsSchema = schema.maybe(
  schema.arrayOf(
    schema.object({
      id: schema.string(),
      params: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
      uuid: schema.maybe(schema.string()),
    }),
    { defaultValue: [] }
  )
);
