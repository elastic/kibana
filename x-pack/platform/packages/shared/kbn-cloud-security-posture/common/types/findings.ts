/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsDataStream, EcsEvent, EcsObserver } from '@elastic/ecs';
import type { CspBenchmarkRuleMetadata } from '../schema/rules/latest';

// Base interface containing common fields for all finding types
interface CspFindingBase {
  '@timestamp': string;
  result: CspFindingResult;
  resource: CspFindingResource;
  rule: CspBenchmarkRuleMetadata;
  host: CspFindingHost;
  event: EcsEvent;
  data_stream: EcsDataStream;
  observer: EcsObserver;
  agent: CspFindingAgent;
  ecs: {
    version: string;
  };
}

// CSPM findings contain cloud-specific fields
interface CspFindingCspm extends CspFindingBase {
  rule: CspBenchmarkRuleMetadata & {
    benchmark: {
      name: string;
      posture_type: 'cspm';
      id: string;
      version: string;
      rule_number?: string;
    };
  };
  cloud: CspFindingCloud;
  cluster_id?: never;
  orchestrator?: never;
}

// KSPM findings contain cluster-specific fields
// Note: cis_eks is treated as KSPM based on functional test evidence showing
// "0 cloud accounts" when grouped by cloud account ID, indicating it uses
// orchestrator.cluster rather than cloud fields
interface CspFindingKspm extends CspFindingBase {
  rule: CspBenchmarkRuleMetadata & {
    benchmark: {
      name: string;
      posture_type: 'kspm';
      id: string;
      version: string;
      rule_number?: string;
    };
  };
  cluster_id?: string;
  orchestrator?: CspFindingOrchestrator;
  cloud?: never;
}

// Legacy findings without posture_type for backward compatibility
interface CspFindingLegacy extends CspFindingBase {
  rule: CspBenchmarkRuleMetadata & {
    benchmark: {
      name: string;
      posture_type?: undefined;
      id: string;
      version: string;
      rule_number?: string;
    };
  };
  cluster_id?: string;
  orchestrator?: CspFindingOrchestrator;
  cloud?: CspFindingCloud;
}

// Discriminated union of all finding types
export type CspFinding = CspFindingCspm | CspFindingKspm | CspFindingLegacy;

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

export interface CspFindingResult {
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
