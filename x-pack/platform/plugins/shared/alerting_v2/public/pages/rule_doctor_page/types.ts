/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RuleDoctorFinding {
  id: string;
  type: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  ruleIds: string[];
  details: Record<string, unknown>;
  current: Record<string, unknown> | null;
  proposed: Record<string, unknown> | null;
  diffs: Array<{ field: string; previous: unknown; proposed: unknown }>;
  explanation: string;
}

export const isValidFinding = (finding: RuleDoctorFinding): boolean =>
  typeof finding.id === 'string' &&
  finding.id.length > 0 &&
  typeof finding.type === 'string' &&
  finding.type.length > 0 &&
  typeof finding.summary === 'string' &&
  finding.summary.length > 0 &&
  typeof finding.action === 'string' &&
  Array.isArray(finding.ruleIds);

export interface RuleDoctorStepProgress {
  stepId: string;
  status: string;
  label: string;
  detail: string | null;
  error: string | null;
}

export interface RuleDoctorExecutionSummary {
  id: string;
  workflowId: string;
  insightType: string;
  insightLabel: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  dataViewName: string | null;
}

export interface RuleDoctorExecutionDetail extends RuleDoctorExecutionSummary {
  findings: RuleDoctorFinding[];
  steps: RuleDoctorStepProgress[];
  error: string | null;
}

export type RuleDoctorPageState = 'idle' | 'loading' | 'running' | 'complete' | 'error';
