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
  jestType?: 'unit' | 'integration';
  testDir?: string;
  ownerPackage?: string;
  owner?: string[];
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
  name: string;
  status: 'stopped' | 'starting' | 'running' | 'error';
  pid?: number;
  uptime?: number;
}

export interface StreamEvent {
  type: string;
  runId?: string;
  data?: string;
  name?: string;
  stream?: string;
}

export interface LogLine {
  data: string;
  type: 'output' | 'error';
}

export type PageId = 'dashboard' | 'configs';
