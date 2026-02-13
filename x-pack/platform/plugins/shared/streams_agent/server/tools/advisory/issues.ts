/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthSeverity } from './scoring';

export type IssueCategory = 'quality' | 'schema' | 'retention' | 'processing' | 'failure_store';

export interface StreamIssue {
  category: IssueCategory;
  severity: HealthSeverity;
  summary: string;
  recommendation: string;
  details: Record<string, unknown>;
}

export const createIssue = ({
  category,
  severity,
  summary,
  recommendation,
  details,
}: {
  category: IssueCategory;
  severity: HealthSeverity;
  summary: string;
  recommendation: string;
  details: Record<string, unknown>;
}): StreamIssue => ({
  category,
  severity,
  summary,
  recommendation,
  details,
});

const severityOrder: Record<HealthSeverity, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
};

/**
 * Sorts issues by severity (critical first, then warning, then good/info).
 * Returns a new array — does not mutate the input.
 */
export const sortIssuesBySeverity = (issues: StreamIssue[]): StreamIssue[] => {
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
};
