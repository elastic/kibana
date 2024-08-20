/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EcsDataStream, EcsEvent } from '@elastic/ecs';
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

export interface CspFinding {
  '@timestamp': string;
  cluster_id?: string;
  orchestrator?: CspFindingOrchestrator;
  cloud?: CspFindingCloud; // only available on CSPM findings
  result: CspFindingResult;
  resource: CspFindingResource;
  rule: CspBenchmarkRuleMetadata;
  host: CspFindingHost;
  event: EcsEvent;
  data_stream: EcsDataStream;
  agent: CspFindingAgent;
  ecs: {
    version: string;
  };
}

interface CspFindingOrchestrator {
  cluster?: {
    id?: string;
    name?: string;
  };
}

interface CspFindingCloud {
  provider: 'aws' | 'azure' | 'gcp';
  account: {
    name: string;
    id: string;
  };
  region?: string;
}

interface CspFindingResult {
  evaluation: 'passed' | 'failed';
  expected?: Record<string, unknown>;
  evidence: Record<string, unknown>;
}

interface CspFindingResource {
  name: string;
  sub_type: string;
  raw: object;
  id: string;
  type: string;
  [other_keys: string]: unknown;
}

interface CspFindingHost {
  id: string;
  containerized: boolean;
  ip: string[];
  mac: string[];
  name: string;
  hostname: string;
  architecture: string;
  os: {
    kernel: string;
    codename: string;
    type: string;
    platform: string;
    version: string;
    family: string;
    name: string;
  };
  [other_keys: string]: unknown;
}

interface CspFindingAgent {
  version: string;
  // ephemeral_id: string;
  id: string;
  name: string;
  type: string;
}
