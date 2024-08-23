/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../constants';

const { string, object, maybe, oneOf, literal, arrayOf } = schema;

export type CspBenchmarkRuleMetadata = TypeOf<typeof cspBenchmarkRuleMetadataSchema>;

export const cspBenchmarkRuleMetadataSchema = object({
  audit: string(),
  benchmark: object({
    name: string(),
    posture_type: maybe(oneOf([literal(CSPM_POLICY_TEMPLATE), literal(KSPM_POLICY_TEMPLATE)])),
    id: string(),
    version: string(),
    rule_number: maybe(string()),
  }),
  default_value: maybe(string()),
  description: string(),
  id: string(),
  impact: maybe(string()),
  name: string(),
  profile_applicability: string(),
  rationale: string(),
  references: maybe(string()),
  rego_rule_id: string(),
  remediation: string(),
  section: string(),
  tags: arrayOf(string()),
  version: string(),
});
