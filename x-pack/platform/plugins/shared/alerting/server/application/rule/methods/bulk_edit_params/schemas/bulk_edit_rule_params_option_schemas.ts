/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { validFields } from '../../../../../../common/constants';

const bulkEditExceptionListField = schema.literal(validFields.EXCEPTIONS_LIST);
const bulkEditRuleSourceField = schema.literal(validFields.RULE_SOURCE);

export const bulkEditParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([bulkEditExceptionListField, bulkEditRuleSourceField]),
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
const bulkEditRuleSourceParamField = schema.literal('params.ruleSource');

export const bulkEditRuleParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([bulkEditExceptionListParamField, bulkEditRuleSourceParamField]),
  value: schema.any(),
});

export const bulkEditRuleParamsOperationsSchema = schema.arrayOf(
  bulkEditRuleParamsOperationSchema,
  { minSize: 1 }
);
