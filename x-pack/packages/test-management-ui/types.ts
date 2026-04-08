/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TestType = 'jest' | 'jest-integration' | 'scout' | 'ftr';

export interface TestConfig {
  id: string;
  type: TestType;
  name: string;
  configPath: string;
  relativePath: string;
  directory: string;
  /** For jest configs, whether it's unit or integration */
  jestType?: 'unit' | 'integration';
  /** For scout configs, the test directory */
  testDir?: string;
  /** Plugin or package that owns this config */
  ownerPackage?: string;
  /** Team that owns this config, from nearest kibana.jsonc owner field */
  owner?: string[];
  /** Number of test files matched within this config's scope */
  testCount?: number;
}

export type TestRunStatus = 'idle' | 'starting' | 'running' | 'passed' | 'failed' | 'stopped';

export interface TestRunResult {
  id: string;
  configId: string;
  status: TestRunStatus;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  output: string[];
  errorOutput: string[];
}

export interface DiscoveredConfigs {
  jest: TestConfig[];
  jestIntegration: TestConfig[];
  scout: TestConfig[];
  ftr: TestConfig[];
  totalCount: number;
  discoveredAt: string;
  discoveryStatus: 'idle' | 'discovering' | 'complete';
  discoveryPhase?: string;
}

export interface ServerStatus {
  type: 'elasticsearch' | 'kibana' | 'custom';
  name: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  uptime?: number;
  command?: string;
}

export interface TestRunEvent {
  type: 'output' | 'error' | 'status' | 'complete';
  runId: string;
  data: string;
  timestamp: string;
}
