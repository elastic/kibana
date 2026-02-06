/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { validFields } from '../../../../../../common/constants';

const bulkEditExceptionListField = schema.literal(validFields.EXCEPTIONS_LIST);
const bulkEditNoteField = schema.literal(validFields.NOTE);
const bulkEditInvestigationFieldsField = schema.literal(validFields.INVESTIGATION_FIELDS);
const bulkEditRuleSourceField = schema.literal(validFields.RULE_SOURCE);

export const bulkEditParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([
    bulkEditExceptionListField,
    bulkEditNoteField,
    bulkEditInvestigationFieldsField,
    bulkEditRuleSourceField,
  ]),
  value: schema.maybe(schema.any()),
});

export const bulkEditParamsOperationsSchema = schema.arrayOf(bulkEditParamsOperationSchema);

export const bulkEditRuleParamsOptionsSchema = schema.object({
  filter: schema.maybe(schema.string()),
  ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
  operations: bulkEditParamsOperationsSchema,
});

const bulkEditExceptionListParamField = schema.literal('params.exceptionsList');
const bulkEditNoteParamField = schema.literal('params.note');
const bulkEditInvestigationFieldsParamField = schema.literal('params.investigationFields');
const bulkEditRuleSourceParamField = schema.literal('params.ruleSource');

export const bulkEditRuleParamsOperationSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.oneOf([
    bulkEditExceptionListParamField,
    bulkEditNoteParamField,
    bulkEditInvestigationFieldsParamField,
    bulkEditRuleSourceParamField,
  ]),
  value: schema.maybe(schema.any()),
});

export const bulkEditRuleParamsOperationsSchema = schema.arrayOf(
  bulkEditRuleParamsOperationSchema,
  { minSize: 1 }
);
