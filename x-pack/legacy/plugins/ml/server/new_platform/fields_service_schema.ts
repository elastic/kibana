/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const getCardinalityOfFieldsSchema = schema.object({
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  fieldNames: schema.maybe(schema.arrayOf(schema.string())),
  query: schema.maybe(schema.any()),
  timeFieldName: schema.maybe(schema.string()),
  earliestMs: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  latestMs: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
});

export const getTimeFieldRangeSchema = schema.object({
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  timeFieldName: schema.maybe(schema.string()),
  query: schema.maybe(schema.any()),
});
