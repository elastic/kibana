/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const VERDICT_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export type Verdict = (typeof VERDICT_OPTIONS)[number];

export const IMPACT_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
export type Impact = (typeof IMPACT_OPTIONS)[number];

export interface SigEventEvidence {
  rule_name: string;
  result: string;
  description: string;
  stream_name: string;
  row_count: number;
  collected_at: string;
  esql_query: string | null;
}

export interface DependencyEdge {
  source: string;
  target: string;
  protocol?: string;
  exposure?: string;
}

export interface InfraComponent {
  title?: string;
  workloads?: string[];
  exposure?: string;
}

export interface CauseKi {
  name: string;
  stream_name: string;
}

export interface SigEvent {
  id: string;
  '@timestamp': string;
  event_id: string;
  discovery_id: string;
  discovery_slug: string;
  title: string;
  summary: string;
  root_cause: string;
  verdict: string;
  criticality: number;
  impact: string;
  recommended_action: string;
  rule_names: string[];
  stream_names: string[];
  recommendations: string[];
  last_reviewed_at: string;
  cause_kis: CauseKi[];
  evidences: SigEventEvidence[];
  dependency_edges: DependencyEdge[];
  infra_components: InfraComponent[];
}

export interface SigEventsListResponse {
  total: number;
  events: SigEvent[];
}

export const VERDICT_COLORS: Record<Verdict, string> = {
  promoted: 'success',
  acknowledged: 'warning',
  demoted: 'default',
};

export const IMPACT_COLORS: Record<Impact, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'hollow',
};
