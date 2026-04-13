/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TestType = 'jest' | 'jest-integration' | 'scout' | 'ftr' | 'ci-check';

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
  command?: string;
  commandArgs?: string[];
  runOptions?: RunOption[];
}

export type RunOptionType = 'text' | 'select' | 'boolean';

export interface RunOption {
  key: string;
  label: string;
  type: RunOptionType;
  flag: string;
  placeholder?: string;
  choices?: Array<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
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
  iteration?: number;
  totalIterations?: number;
  repeatBatchId?: string;
  testFile?: string;
}

export interface DiscoveredConfigs {
  jest: TestConfig[];
  jestIntegration: TestConfig[];
  scout: TestConfig[];
  ftr: TestConfig[];
  ciChecks: TestConfig[];
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

export interface CIJob {
  id: string;
  name: string;
  state: string;
  exitStatus: number | null;
  webUrl: string;
}

export interface PRInfo {
  number: number;
  title: string;
  state: string;
  url: string;
  branch: string;
  baseBranch: string;
  ciStatus: 'pending' | 'passing' | 'failing' | 'unknown';
  buildkiteUrl?: string;
  buildkiteBuildNumber?: number;
  failedJobs: CIJob[];
  allJobs: CIJob[];
  failedConfigIds: string[];
  failedStepNames: string[];
  failedSteps: Array<{ name: string; url: string }>;
}

export interface ChangedFilesInfo {
  baseBranch: string;
  changedFiles: string[];
  affectedConfigIds: string[];
  affectedTsProjects: string[];
  changedLintableFiles: string[];
}

export interface TestFileSearchResult {
  file: string;
  configId: string;
  configName: string;
  configType: string;
}

export type PageId = 'dashboard' | 'configs';
