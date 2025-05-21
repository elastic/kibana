/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';

// Since version 8.3.0

export type CspBenchmarkRule = TypeOf<typeof cspBenchmarkRuleSchema>;

export const cspBenchmarkRuleSchema = schema.object({
  audit: schema.string(),
  benchmark: schema.object({ name: schema.string(), version: schema.string() }),
  default_value: schema.maybe(schema.string()),
  description: schema.string(),
  enabled: schema.boolean(),
  id: schema.string(),
  impact: schema.maybe(schema.string()),
  muted: schema.boolean(),
  name: schema.string(),
  profile_applicability: schema.string(),
  rationale: schema.string(),
  references: schema.maybe(schema.string()),
  rego_rule_id: schema.string(),
  remediation: schema.string(),
  section: schema.string(),
  tags: schema.arrayOf(schema.string()),
  version: schema.string(),
});
