/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

const MAX_FILTER_LENGTH = 8192;
const MAX_ID_LENGTH = 1024;
const MAX_MUTED_ALERT_IDS = 100_000;
const MAX_RESPONSE_DATA_SIZE = 10_000;

export const findMutedAlertInstancesRequestBodySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
  }),
  page: schema.number({
    defaultValue: 1,
    min: 1,
  }),
  filter: schema.maybe(schema.string({ maxLength: MAX_FILTER_LENGTH })),
});

const findMutedAlertInstancesResponseDataSchema = schema.arrayOf(
  schema.object({
    id: schema.string({ maxLength: MAX_ID_LENGTH }),
    muted_alert_ids: schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), {
      maxSize: MAX_MUTED_ALERT_IDS,
    }),
  }),
  { maxSize: MAX_RESPONSE_DATA_SIZE }
);

export const findMutedAlertInstancesResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: findMutedAlertInstancesResponseDataSchema,
});
