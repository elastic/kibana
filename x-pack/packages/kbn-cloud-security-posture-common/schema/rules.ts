/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf, schema } from '@kbn/config-schema';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../constants';

export type CspBenchmarkRuleMetadata = TypeOf<typeof cspBenchmarkRuleMetadataSchema>;

export const cspBenchmarkRuleMetadataSchema = schema.object({
  audit: schema.string(),
  benchmark: schema.object({
    name: schema.string(),
    posture_type: schema.maybe(
      schema.oneOf([schema.literal(CSPM_POLICY_TEMPLATE), schema.literal(KSPM_POLICY_TEMPLATE)])
    ),
    id: schema.string(),
    version: schema.string(),
    rule_number: schema.maybe(schema.string()),
  }),
  default_value: schema.maybe(schema.string()),
  description: schema.string(),
  id: schema.string(),
  impact: schema.maybe(schema.string()),
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

export const ruleStateAttributes = schema.object({
  muted: schema.boolean(),
  benchmark_id: schema.string(),
  benchmark_version: schema.string(),
  rule_number: schema.string(),
  rule_id: schema.string(),
});

export const rulesStates = schema.recordOf(schema.string(), ruleStateAttributes);

export type CspBenchmarkRulesStates = TypeOf<typeof rulesStates>;
