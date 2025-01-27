/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const unsnoozeParamsSchema = schema.object({
  id: schema.string(),
});

const scheduleIdsSchema = schema.maybe(schema.arrayOf(schema.string()));

export const unsnoozeBodySchema = schema.object({
  schedule_ids: scheduleIdsSchema,
});
