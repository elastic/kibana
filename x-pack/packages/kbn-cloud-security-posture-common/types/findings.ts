/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsDataStream, EcsEvent } from '@elastic/ecs';
import type { CspBenchmarkRuleMetadata } from '../schema/rules/latest';

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
