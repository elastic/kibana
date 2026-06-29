/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const MAX_FILTER_LENGTH = 8192;

export const findMutedAlertsOptionsSchema = schema.object({
  perPage: schema.maybe(schema.number()),
  page: schema.maybe(schema.number()),
  filter: schema.maybe(
    schema.oneOf([
      schema.string({ maxLength: MAX_FILTER_LENGTH }),
      schema.recordOf(schema.string({ maxLength: MAX_FILTER_LENGTH }), schema.any()),
    ])
  ),
});

export const findMutedAlertsParamsSchema = schema.object({
  options: schema.maybe(findMutedAlertsOptionsSchema),
});
