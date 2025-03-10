/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleParamsSchemaWithDefaultValueV1 } from '@kbn/response-ops-rule-params';
import { validateDurationV1 } from '../../../validation';
import { ruleNotifyWhen } from '../../../common';

export const actionSchema = schema.object({
  group: schema.maybe(schema.string()),
  id: schema.string(),
  params: schema.recordOf(schema.string(), schema.maybe(schema.any()), {
    defaultValue: {},
  }),
  uuid: schema.maybe(schema.string()),
  frequency: schema.maybe(
    schema.object({
      summary: schema.boolean(),
      notify_when: schema.oneOf([
        schema.literal(ruleNotifyWhen.CHANGE),
        schema.literal(ruleNotifyWhen.ACTIVE),
        schema.literal(ruleNotifyWhen.THROTTLE),
      ]),
      throttle: schema.nullable(schema.string()),
    })
  ),
});

export const previewBodySchema = schema.object({
  name: schema.string(),
  rule_type_id: schema.string(),
  consumer: schema.string(),
  schedule: schema.object({
    interval: schema.string({
      validate: validateDurationV1,
    }),
  }),
  tags: schema.arrayOf(schema.string()),
  params: ruleParamsSchemaWithDefaultValueV1,
  actions: schema.arrayOf(actionSchema, { defaultValue: [] }),
});
