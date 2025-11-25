/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

const bulkEditExceptionListField = schema.literal('exceptionsList');

export const bulkEditParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([bulkEditExceptionListField]),
  value: schema.any(),
});

export const bulkEditParamsOperationsSchema = schema.arrayOf(bulkEditParamsOperationSchema, {
  minSize: 1,
});

export const bulkEditRuleParamsOptionsSchema = schema.object({
  filter: schema.maybe(schema.string()),
  ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
  operations: bulkEditParamsOperationsSchema,
});

const bulkEditExceptionListParamField = schema.literal('params.exceptionsList');

export const bulkEditRuleParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([bulkEditExceptionListParamField]),
  value: schema.any(),
});

export const bulkEditRuleParamsOperationsSchema = schema.arrayOf(
  bulkEditRuleParamsOperationSchema,
  { minSize: 1 }
);
