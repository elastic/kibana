/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ML_ENTITY_FIELD_OPERATIONS, ML_ENTITY_FIELD_TYPE } from './anomaly_utils';

export const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export const mlEntityFieldTypeSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_TYPE.BY),
  schema.literal(ML_ENTITY_FIELD_TYPE.OVER),
  schema.literal(ML_ENTITY_FIELD_TYPE.PARTITION),
]);

export const mlEntityFieldOperationSchema = schema.oneOf([
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.ADD),
  schema.literal(ML_ENTITY_FIELD_OPERATIONS.REMOVE),
]);

export const mlEntityFieldSchema = schema.object({
  fieldName: schema.string(),
  fieldValue: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
  fieldType: schema.maybe(mlEntityFieldTypeSchema),
  operation: schema.maybe(mlEntityFieldOperationSchema),
  cardinality: schema.maybe(schema.number()),
});
