/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { isInterval } from '../../lib/intervals';
import { scheduleRruleSchemaV1, scheduleRruleSchemaV2, scheduleRruleSchemaV3 } from './rrule';

export function validateDuration(duration: string) {
  if (!isInterval(duration)) {
    return 'string is not a valid duration: ' + duration;
  }
}

export const taskSchemaV1 = schema.object({
  taskType: schema.string(),
  scheduledAt: schema.string(),
  startedAt: schema.nullable(schema.string()),
  retryAt: schema.nullable(schema.string()),
  runAt: schema.string(),
  schedule: schema.maybe(
    schema.object({
      interval: schema.string({ validate: validateDuration }),
    })
  ),
  params: schema.string(),
  state: schema.string(),
  stateVersion: schema.maybe(schema.number()),
  traceparent: schema.string(),
  user: schema.maybe(schema.string()),
  scope: schema.maybe(schema.arrayOf(schema.string())),
  ownerId: schema.nullable(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  timeoutOverride: schema.maybe(schema.string()),
  attempts: schema.number(),
  status: schema.oneOf([
    schema.literal('idle'),
    schema.literal('claiming'),
    schema.literal('running'),
    schema.literal('failed'),
    schema.literal('unrecognized'),
    schema.literal('dead_letter'),
  ]),
  version: schema.maybe(schema.string()),
});

export const taskSchemaV2 = taskSchemaV1.extends({
  partition: schema.maybe(schema.number()),
});

export const taskSchemaV3 = taskSchemaV2.extends({
  priority: schema.maybe(schema.number()),
});

export const scheduleIntervalSchema = schema.object({
  interval: schema.string({ validate: validateDuration }),
});

export const taskSchemaV4 = taskSchemaV3.extends({
  apiKey: schema.maybe(schema.string()),
  userScope: schema.maybe(
    schema.object({
      apiKeyId: schema.string(),
      spaceId: schema.string(),
      apiKeyCreatedByUser: schema.boolean(),
    })
  ),
});

export const taskSchemaV5 = taskSchemaV4.extends({
  schedule: schema.maybe(schema.oneOf([scheduleIntervalSchema, scheduleRruleSchemaV1])),
});

export const taskSchemaV6 = taskSchemaV5.extends({
  schedule: schema.maybe(schema.oneOf([scheduleIntervalSchema, scheduleRruleSchemaV2])),
});

export const taskSchemaV7 = taskSchemaV6.extends({
  schedule: schema.maybe(schema.oneOf([scheduleIntervalSchema, scheduleRruleSchemaV3])),
});
