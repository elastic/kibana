/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  dependencyEdgeSchema,
  infraComponentSchema,
  causeKiSchema,
  evidenceSchema,
} from '../common_schemas';

export const SIG_EVENT_VERDICT_OPTIONS = ['promoted', 'acknowledged', 'demoted'] as const;
export const sigEventVerdictSchema = z.enum(SIG_EVENT_VERDICT_OPTIONS);
export type SigEventVerdict = z.infer<typeof sigEventVerdictSchema>;

export const SIG_EVENT_IMPACT_OPTIONS = ['critical', 'high', 'medium', 'low'] as const;
export const sigEventImpactSchema = z.enum(SIG_EVENT_IMPACT_OPTIONS);
export type SigEventImpact = z.infer<typeof sigEventImpactSchema>;

export const sigEventSchema = z.object({
  '@timestamp': z.iso.datetime(),
  created_at: z.iso.datetime(),
  event_id: z.string(),
  discovery_id: z.string().optional(),
  discovery_slug: z.string(),
  previous_event_id: z.string().optional(),
  verdict: sigEventVerdictSchema,
  verdict_id: z.string().optional(),
  workflow_execution_id: z.string().optional(),
  rule_names: z.array(z.string()).optional(),
  stream_names: z.array(z.string()),
  title: z.string(),
  summary: z.string(),
  root_cause: z.string(),
  criticality: z.number(),
  confidence: z.number(),
  recommended_action: z.string().optional(),
  impact: sigEventImpactSchema,
  recommendations: z.array(z.string()),
  dependency_edges: z.array(dependencyEdgeSchema).optional(),
  infra_components: z.array(infraComponentSchema).optional(),
  cause_kis: z.array(causeKiSchema).optional(),
  evidences: z.array(evidenceSchema).optional(),
  grouped_into: z.string().optional(),
});

export type SigEvent = z.infer<typeof sigEventSchema>;
