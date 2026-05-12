/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

export const VERDICT_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export type Verdict = (typeof VERDICT_OPTIONS)[number];

export const IMPACT_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
export type Impact = (typeof IMPACT_OPTIONS)[number];

export const EVIDENCE_RESULTS = ['found', 'empty', 'error'] as const;
export const EXPOSURE_VALUES = ['exposed', 'not_exposed'] as const;

export const SIG_EVENT_DOC_TYPES = ['detection', 'discovery', 'verdict', 'event'] as const;
export type SigEventDocType = (typeof SIG_EVENT_DOC_TYPES)[number];

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

const isVerdict = (v: string): v is Verdict => v in VERDICT_COLORS;
const isImpact = (v: string): v is Impact => v in IMPACT_COLORS;

export const getVerdictColor = (verdict: string): string =>
  isVerdict(verdict) ? VERDICT_COLORS[verdict] : 'default';

export const getImpactColor = (impact: string): string =>
  isImpact(impact) ? IMPACT_COLORS[impact] : 'hollow';

// ---------------------------------------------------------------------------
// Shared sub-schemas (reused by both SigEvent and Lifecycle schemas)
// ---------------------------------------------------------------------------

export const causeKiSchema = z.object({
  name: z.string(),
  stream_name: z.string(),
});

export const dependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  protocol: z.string().optional(),
  exposure: z.string().optional(),
});

export const infraComponentSchema = z.object({
  title: z.string().optional(),
  workloads: z.array(z.string()).optional(),
  exposure: z.string().optional(),
});

export const sigEventEvidenceSchema = z.object({
  rule_name: z.string(),
  result: z.string(),
  description: z.string(),
  stream_name: z.string(),
  row_count: z.number(),
  collected_at: z.string(),
  esql_query: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// SigEvent schema (events index document shape)
// ---------------------------------------------------------------------------

export const sigEventSchema = z.object({
  id: z.string(),
  '@timestamp': z.string(),
  event_id: z.string().optional().default(''),
  discovery_id: z.string().optional().default(''),
  discovery_slug: z.string().optional().default(''),
  title: z.string().optional().default(''),
  summary: z.string().optional().default(''),
  root_cause: z.string().optional().default(''),
  verdict: z.string().optional().default(''),
  criticality: z.number().optional().default(0),
  impact: z.string().optional().default(''),
  recommended_action: z.string().optional().default(''),
  rule_names: z.array(z.string()).optional().default([]),
  stream_names: z.array(z.string()).optional().default([]),
  recommendations: z.array(z.string()).optional().default([]),
  last_reviewed_at: z.string().optional().default(''),
  cause_kis: z.array(causeKiSchema).optional().default([]),
  evidences: z.array(sigEventEvidenceSchema).optional().default([]),
  dependency_edges: z.array(dependencyEdgeSchema).optional().default([]),
  infra_components: z.array(infraComponentSchema).optional().default([]),
});

export const sigEventsListResponseSchema = z.object({
  total: z.number(),
  events: z.array(sigEventSchema),
});

export type SigEventEvidence = z.infer<typeof sigEventEvidenceSchema>;
export type DependencyEdge = z.infer<typeof dependencyEdgeSchema>;
export type InfraComponent = z.infer<typeof infraComponentSchema>;
export type CauseKi = z.infer<typeof causeKiSchema>;
export type SigEvent = z.infer<typeof sigEventSchema>;
export type SigEventsListResponse = z.infer<typeof sigEventsListResponseSchema>;

// ---------------------------------------------------------------------------
// Lifecycle response schemas & types (stricter versions for API responses)
// ---------------------------------------------------------------------------

export const lifecycleEvidenceSchema = sigEventEvidenceSchema.extend({
  rule_name: z.string().nullable(),
  result: z.enum(EVIDENCE_RESULTS),
  confirmed: z.boolean().optional(),
});

export const lifecycleDependencyEdgeSchema = dependencyEdgeSchema.extend({
  exposure: z.enum(EXPOSURE_VALUES).optional(),
});

export const lifecycleInfraComponentSchema = infraComponentSchema.extend({
  exposure: z.enum(EXPOSURE_VALUES).optional(),
});

export const lifecycleCauseKiSchema = causeKiSchema;

export const lifecycleDetectionSchema = z.object({
  id: z.string(),
  detection_id: z.string(),
  timestamp: z.string(),
  rule_name: z.string(),
  stream_name: z.string(),
  alert_count: z.number(),
  change_point_type: z.string().nullable(),
  p_value: z.number().nullable(),
  superseded: z.boolean(),
});

export const lifecycleDiscoverySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  criticality: z.number().nullable(),
  impact: z.string().nullable(),
  confidence: z.number().nullable(),
  evidences: z.array(lifecycleEvidenceSchema),
  dependency_edges: z.array(lifecycleDependencyEdgeSchema),
  infra_components: z.array(lifecycleInfraComponentSchema),
  cause_kis: z.array(lifecycleCauseKiSchema),
  discovery_slug: z.string(),
  kind: z.string(),
  change_point_occurrence: z.string().nullable(),
  conversation_id: z.string().nullable(),
});

export const lifecycleVerdictSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  verdict: z.string(),
  original_verdict: z.string().optional(),
  verdict_summary: z.string(),
  assessment_note: z.string(),
  recommended_action: z.string(),
  criticality: z.number().nullable(),
  confidence: z.number().nullable(),
  recommendations: z.array(z.string()),
  evidences: z.array(lifecycleEvidenceSchema),
  conversation_id: z.string().nullable(),
});

export const sigEventLifecycleSchema = z.object({
  event_id: z.string(),
  detections: z.array(lifecycleDetectionSchema),
  discoveries: z.array(lifecycleDiscoverySchema),
  verdicts: z.array(lifecycleVerdictSchema),
});

export type LifecycleEvidence = z.infer<typeof lifecycleEvidenceSchema>;
export type LifecycleDependencyEdge = z.infer<typeof lifecycleDependencyEdgeSchema>;
export type LifecycleInfraComponent = z.infer<typeof lifecycleInfraComponentSchema>;
export type LifecycleCauseKi = z.infer<typeof lifecycleCauseKiSchema>;
export type LifecycleDetection = z.infer<typeof lifecycleDetectionSchema>;
export type LifecycleDiscovery = z.infer<typeof lifecycleDiscoverySchema>;
export type LifecycleVerdict = z.infer<typeof lifecycleVerdictSchema>;
export type SigEventLifecycle = z.infer<typeof sigEventLifecycleSchema>;
