/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export type CspBenchmarkRulesStates = TypeOf<typeof rulesStates>;
const ruleStateAttributes = schema.object({
  muted: schema.boolean(),
  benchmark_id: schema.string(),
  benchmark_version: schema.string(),
  rule_number: schema.string(),
  rule_id: schema.string(),
});

const rulesStates = schema.recordOf(schema.string(), ruleStateAttributes);
