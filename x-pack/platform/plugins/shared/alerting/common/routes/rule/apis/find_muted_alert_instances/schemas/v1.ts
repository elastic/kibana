/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const findMutedAlertInstancesRequestBodySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
  }),
  page: schema.number({
    defaultValue: 1,
    min: 1,
  }),
  filter: schema.maybe(schema.string()),
});

const findMutedAlertInstancesResponseDataSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
    muted_alert_ids: schema.arrayOf(schema.string()),
  })
);

export const findMutedAlertInstancesResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: findMutedAlertInstancesResponseDataSchema,
});
