/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';
import {
  rawAdHocRunParamsSchema as rawAdHocRunParamsSchemaV1,
  rawAdHocRunParamsRuleSchema as rawAdHocRunParamsRuleSchemaV1,
} from './v1';

const ISOWeekdaysSchema = schema.oneOf([
  schema.literal(1),
  schema.literal(2),
  schema.literal(3),
  schema.literal(4),
  schema.literal(5),
  schema.literal(6),
  schema.literal(7),
]);

const rawRuleAlertsFilterSchema = schema.object({
  query: schema.maybe(
    schema.object({
      kql: schema.string(),
      filters: schema.arrayOf(
        schema.object({
          query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          meta: schema.object({
            alias: schema.maybe(schema.nullable(schema.string())),
            disabled: schema.maybe(schema.boolean()),
            negate: schema.maybe(schema.boolean()),
            controlledBy: schema.maybe(schema.string()),
            group: schema.maybe(schema.string()),
            index: schema.maybe(schema.string()),
            isMultiIndex: schema.maybe(schema.boolean()),
            type: schema.maybe(schema.string()),
            key: schema.maybe(schema.string()),
            params: schema.maybe(schema.any()),
            value: schema.maybe(schema.string()),
            field: schema.maybe(schema.string()),
            relation: schema.maybe(schema.oneOf([schema.literal('OR'), schema.literal('AND')])),
          }),
          $state: schema.maybe(
            schema.object({
              store: schema.oneOf([
                schema.literal(FilterStateStore.APP_STATE), // change
                schema.literal(FilterStateStore.GLOBAL_STATE), // change
              ]),
            })
          ),
        })
      ),
      dsl: schema.string(), // change
    })
  ),
  timeframe: schema.maybe(
    schema.object({
      days: schema.arrayOf(ISOWeekdaysSchema),
      hours: schema.object({
        start: schema.string(),
        end: schema.string(),
      }),
      timezone: schema.string(),
    })
  ),
});

const rawAdHocRunParamsRuleActionSchema = schema.object({
  uuid: schema.string(),
  group: schema.maybe(schema.string()),
  actionRef: schema.string(),
  actionTypeId: schema.string(),
  params: schema.recordOf(schema.string(), schema.any()),
  frequency: schema.maybe(
    schema.object({
      summary: schema.boolean(),
      notifyWhen: schema.oneOf([
        schema.literal('onActionGroupChange'),
        schema.literal('onActiveAlert'),
        schema.literal('onThrottleInterval'),
      ]),
      throttle: schema.nullable(schema.string()),
    })
  ),
  alertsFilter: schema.maybe(rawRuleAlertsFilterSchema),
  useAlertDataForTemplate: schema.maybe(schema.boolean()),
});

export const rawAdHocRunParamsRuleSchema = rawAdHocRunParamsRuleSchemaV1.extends({
  actions: schema.maybe(schema.arrayOf(rawAdHocRunParamsRuleActionSchema)),
});

export const rawAdHocRunParamsSchema = rawAdHocRunParamsSchemaV1.extends({
  rule: rawAdHocRunParamsRuleSchema,
});
