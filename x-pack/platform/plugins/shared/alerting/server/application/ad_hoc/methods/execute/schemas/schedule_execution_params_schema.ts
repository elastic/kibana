/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { backfillInitiator } from '../../../../../../common/constants';

export const scheduleExecutionParamSchema = schema.object({
  ruleId: schema.string(),
  start: schema.maybe(schema.string()),
  end: schema.maybe(schema.string()),
  initiator: schema.oneOf([
    schema.literal(backfillInitiator.USER),
    schema.literal(backfillInitiator.SYSTEM),
  ]),
  initiatorId: schema.maybe(schema.string()),
});

export const scheduleExecutionParamsSchema = schema.arrayOf(scheduleExecutionParamSchema);
