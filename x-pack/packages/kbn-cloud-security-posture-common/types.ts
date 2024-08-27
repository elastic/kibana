/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EcsDataStream, EcsEvent } from '@elastic/ecs';
import type { CspBenchmarkRuleMetadata } from './schema/rules';

export type CspStatusCode =
  | 'indexed' // latest findings index exists and has results
  | 'indexing' // index timeout was not surpassed since installation, assumes data is being indexed
  | 'unprivileged' // user lacks privileges for the latest findings index
  | 'index-timeout' // index timeout was surpassed since installation
  | 'not-deployed' // no healthy agents were deployed
  | 'not-installed' // number of installed csp integrations is 0;
  | 'waiting_for_results'; // have healthy agents but no findings at all, assumes data is being indexed for the 1st time

export type IndexStatus =
  | 'not-empty' // Index contains documents
  | 'empty' // Index doesn't contain documents (or doesn't exist)
  | 'unprivileged'; // User doesn't have access to query the index

export interface IndexDetails {
  index: string;
  status: IndexStatus;
}

export interface BaseCspSetupBothPolicy {
  status: CspStatusCode;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface BaseCspSetupStatus {
  indicesDetails: IndexDetails[];
  latestPackageVersion: string;
  cspm: BaseCspSetupBothPolicy;
  kspm: BaseCspSetupBothPolicy;
  vuln_mgmt: BaseCspSetupBothPolicy;
  isPluginInitialized: boolean;
  installedPackageVersion?: string | undefined;
  hasMisconfigurationsFindings?: boolean;
}

export type CspSetupStatus = BaseCspSetupStatus;

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
