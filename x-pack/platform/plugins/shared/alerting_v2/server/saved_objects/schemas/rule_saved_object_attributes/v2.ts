/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV1 } from './v1';

/**
 * Schema for the last execution outcome persisted directly on the rule SO.
 *
 * Two-state outcome (`success` / `failure`) mirrors `ExecutionEventLogger`'s
 * `ExecutionOutcome`. If we introduce a `warning` state later we can extend
 * this without another mapping migration since the mapped subset (outcome,
 * timestamp, duration_ms) is forward-compatible as long as outcome stays a
 * keyword.
 *
 * `message` and `error_message` are intentionally unmapped (`dynamic: false`
 * at the root) so we avoid per-run churn on the mappings for unbounded text.
 */
const lastExecutionSchema = schema.object({
  outcome: schema.oneOf([schema.literal('success'), schema.literal('failure')]),
  timestamp: schema.string(),
  duration_ms: schema.number(),
  message: schema.nullable(schema.string()),
  error_message: schema.nullable(schema.string()),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV1.extends({
  last_execution: schema.maybe(schema.nullable(lastExecutionSchema)),
});
