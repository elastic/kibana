/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

const exceptionListSchema = schema.object({
  id: schema.string(),
  list_id: schema.string(),
  type: schema.oneOf([
    schema.literal('detection'),
    schema.literal('rule_default'),
    schema.literal('endpoint'),
    schema.literal('endpoint_trusted_apps'),
    schema.literal('endpoint_events'),
    schema.literal('endpoint_host_isolation_exceptions'),
    schema.literal('endpoint_blocklists'),
  ]),
  namespace_type: schema.oneOf([schema.literal('single'), schema.literal('agnostic')]),
});

const bulkEditExceptionListSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.literal('exceptionsList'),
  value: schema.arrayOf(exceptionListSchema),
});

export const bulkEditParamsOperationSchema = schema.oneOf([bulkEditExceptionListSchema]);

export const bulkEditParamsOperationsSchema = schema.arrayOf(bulkEditParamsOperationSchema, {
  minSize: 1,
});

export const bulkEditRuleParamsOptionsSchema = schema.object({
  filter: schema.maybe(schema.string()),
  ids: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1 })),
  operations: bulkEditParamsOperationsSchema,
});

const bulkEditExceptionListEditSchema = schema.object({
  operation: schema.literal('set'),
  field: schema.literal('params.exceptionsList'),
  value: schema.arrayOf(exceptionListSchema),
});

export const bulkEditRuleParamsOperationSchema = schema.oneOf([bulkEditExceptionListEditSchema]);

export const bulkEditRuleParamsOperationsSchema = schema.arrayOf(
  bulkEditRuleParamsOperationSchema,
  { minSize: 1 }
);
