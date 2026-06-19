/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { runDiscoveryInvestigator } from './run_investigator';
export type { RunDiscoveryInvestigatorParams } from './run_investigator';

export { runDiscoveryJudge } from './run_judge';
export type { RunDiscoveryJudgeParams } from './run_judge';

export type {
  ToolCallRecord,
  EvidenceEsqlRecord,
  DiscoveryInvestigatorToolUsage,
  JudgeToolUsage,
} from './types';
