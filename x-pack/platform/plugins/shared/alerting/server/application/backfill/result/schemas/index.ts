/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleParamsSchema } from '@kbn/response-ops-rule-params';
import { adHocRunStatus } from '../../../../../common/constants';

export const statusSchema = schema.oneOf([
  schema.literal(adHocRunStatus.COMPLETE),
  schema.literal(adHocRunStatus.PENDING),
  schema.literal(adHocRunStatus.RUNNING),
  schema.literal(adHocRunStatus.ERROR),
  schema.literal(adHocRunStatus.TIMEOUT),
]);

export const backfillScheduleSchema = schema.object({
  runAt: schema.string(),
  status: statusSchema,
  interval: schema.string(),
});

export const backfillSchema = schema.object({
  id: schema.string(),
  createdAt: schema.string(),
  duration: schema.string(),
  enabled: schema.boolean(),
  rule: schema.object({
    id: schema.string(),
    name: schema.string(),
    tags: schema.arrayOf(schema.string()),
    alertTypeId: schema.string(),
    params: ruleParamsSchema,
    apiKeyOwner: schema.nullable(schema.string()),
    apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
    consumer: schema.string(),
    enabled: schema.boolean(),
    schedule: schema.object({ interval: schema.string() }),
    createdBy: schema.nullable(schema.string()),
    updatedBy: schema.nullable(schema.string()),
    createdAt: schema.string(),
    updatedAt: schema.string(),
    revision: schema.number(),
  }),
  spaceId: schema.string(),
  start: schema.string(),
  status: statusSchema,
  end: schema.maybe(schema.string()),
  schedule: schema.arrayOf(backfillScheduleSchema),
});
